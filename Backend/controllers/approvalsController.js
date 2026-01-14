const { sql, getPool } = require("../db/pool");
const { sendPlanApprovedEmail, sendPlanRejectedEmail } = require("../controllers/planController");

const isAuthorizedApprover = (user) => {
  return user?.isApprover === true || user?.isApprover === 1;
};

/**
 * Get all master plans with approval status
 */
exports.getAllApprovals = async (req, res) => {
  const userEmail = req.user.email;
  const userDepartment = req.user.department;
  const isApprover = isAuthorizedApprover(req.user);

  console.log(`📋 Fetching approvals for user: ${userEmail} (Approver: ${isApprover})`);

  try {
    const pool = await getPool();

    const request = pool.request();
    request.input("UserDepartment", sql.NVarChar, userDepartment);

    const result = await request.query(`
      SELECT 
        mp.Id,
        mp.Project,
        mp.StartDate,
        mp.EndDate,
        mp.CreatedAt,
        mp.UserId,
        mp.ApprovalStatus,
        mp.PendingChanges,
        mp.ApprovedBy,
        mp.ApprovedAt,
        mp.RejectedBy,
        mp.RejectedAt,
        mp.RejectionReason,
        creator.FirstName as CreatorFirstName,
        creator.LastName as CreatorLastName,
        creator.Email as CreatorEmail,
        creator.Department as CreatorDepartment,
        approver.FirstName as ApproverFirstName,
        approver.LastName as ApproverLastName,
        rejector.FirstName as RejectorFirstName,
        rejector.LastName as RejectorLastName,
        (SELECT COUNT(*) FROM MasterPlanFields WHERE MasterPlanId = mp.Id) as MilestoneCount
      FROM MasterPlan mp
      LEFT JOIN Users creator ON mp.UserId = creator.Id
      LEFT JOIN Users approver ON mp.ApprovedBy = approver.Id
      LEFT JOIN Users rejector ON mp.RejectedBy = rejector.Id
      WHERE 
        creator.Department = @UserDepartment
      ORDER BY 
        CASE mp.ApprovalStatus
          WHEN 'Pending Approval' THEN 1
          WHEN 'Under Review' THEN 2
          WHEN 'Approved' THEN 3
          WHEN 'Rejected' THEN 4
        END,
        mp.CreatedAt DESC
    `);

    const approvals = await Promise.all(
      result.recordset.map(async row => {
        let latestUpdate = null;

        // ✅ READ FROM PENDINGCHANGES JSON (not history table)
        if (row.PendingChanges) {
          try {
            const pendingData = JSON.parse(row.PendingChanges);
            const batchKey = pendingData.batchKey || 'LEGACY';

            // Get CURRENT approved state for comparison
            const currentFieldsReq = pool.request();
            currentFieldsReq.input("MasterPlanId", sql.Int, row.Id);

            const currentFieldsResult = await currentFieldsReq.query(`
              SELECT FieldName, FieldValue, StartDate, EndDate
              FROM MasterPlanFields
              WHERE MasterPlanId = @MasterPlanId
            `);

            const currentFields = {};
            currentFieldsResult.recordset.forEach(f => {
              currentFields[f.FieldName] = {
                status: f.FieldValue,
                startDate: f.StartDate ? new Date(f.StartDate).toISOString().split('T')[0] : null,
                endDate: f.EndDate ? new Date(f.EndDate).toISOString().split('T')[0] : null
              };
            });

            // Build changes array by comparing current vs pending
            const changes = [];
            const pendingFields = pendingData.fields || {};

            if (pendingData.project && pendingData.project !== row.Project) {
              changes.push({
                milestone: 'Project Name',
                oldValue: row.Project,
                newValue: pendingData.project,
                justification: null,
                changedAt: pendingData.submittedAt
              });
            }

            // ✅ CHECK ROOT-LEVEL CHANGES (Start/End Dates)
            const currentStartDate = row.StartDate ? new Date(row.StartDate).toISOString().split('T')[0] : null;
            const currentEndDate = row.EndDate ? new Date(row.EndDate).toISOString().split('T')[0] : null;

            if (
              pendingData.startDate !== currentStartDate ||
              pendingData.endDate !== currentEndDate
            ) {
              changes.push({
                milestone: 'Project Timeline',
                oldValue: `${currentStartDate} to ${currentEndDate}`,
                newValue: `${pendingData.startDate} to ${pendingData.endDate}`,
                justification: null,
                changedAt: pendingData.submittedAt
              });
            }

            // ✅ THEN CHECK MILESTONE-LEVEL CHANGES
            for (const [fieldName, pendingField] of Object.entries(pendingFields)) {
              const currentField = currentFields[fieldName];

              if (!currentField) {
                // NEW MILESTONE
                changes.push({
                  milestone: fieldName,
                  oldValue: null,
                  newValue: `${pendingField.status} (${pendingField.startDate} - ${pendingField.endDate})`,
                  justification: pendingData.justifications?.[fieldName] || null,
                  changedAt: pendingData.submittedAt
                });
              } else {
                // CHECK STATUS CHANGE
                if (currentField.status !== pendingField.status) {
                  changes.push({
                    milestone: fieldName,
                    oldValue: currentField.status,
                    newValue: pendingField.status,
                    justification: pendingData.justifications?.[fieldName] || null,
                    changedAt: pendingData.submittedAt
                  });
                }

                // CHECK DATE CHANGES
                if (
                  currentField.startDate !== pendingField.startDate ||
                  currentField.endDate !== pendingField.endDate
                ) {
                  changes.push({
                    milestone: fieldName,
                    oldValue: `${currentField.startDate} - ${currentField.endDate}`,
                    newValue: `${pendingField.startDate} - ${pendingField.endDate}`,
                    justification: pendingData.justifications?.[fieldName] || null,
                    changedAt: pendingData.submittedAt
                  });
                }
              }
            }

            // CHECK FOR DELETED MILESTONES
            for (const [fieldName, currentField] of Object.entries(currentFields)) {
              if (!pendingFields[fieldName]) {
                changes.push({
                  milestone: fieldName,
                  oldValue: `${currentField.status} (${currentField.startDate} - ${currentField.endDate})`,
                  newValue: null,
                  justification: pendingData.justifications?.[fieldName] || null,
                  changedAt: pendingData.submittedAt
                });
              }
            }

            if (changes.length > 0) {
              latestUpdate = {
                batchKey: batchKey,
                changeCount: changes.length,
                changes: changes
              };
            }
          } catch (err) {
            console.error(`⚠️ Failed to parse PendingChanges for plan ${row.Id}:`, err);
          }
        }

        return {
          id: row.Id,
          title: row.Project,
          type: "Master Plan",
          createdBy: `${row.CreatorFirstName} ${row.CreatorLastName}`,
          createdByEmail: row.CreatorEmail,
          createdDate: row.CreatedAt,
          department: row.CreatorDepartment,
          status: row.ApprovalStatus || 'Pending Approval',
          startDate: row.StartDate,
          endDate: row.EndDate,
          milestoneCount: row.MilestoneCount,
          latestUpdate: latestUpdate,
          approvedBy: row.ApproverFirstName ? `${row.ApproverFirstName} ${row.ApproverLastName}` : null,
          approvedAt: row.ApprovedAt,
          rejectedBy: row.RejectorFirstName ? `${row.RejectorFirstName} ${row.RejectorLastName}` : null,
          rejectedAt: row.RejectedAt,
          rejectionReason: row.RejectionReason,
          canApprove: isApprover && row.ApprovalStatus === 'Pending Approval',
          canReject: isApprover && row.ApprovalStatus === 'Pending Approval',
          isApprover
        };
      })
    );

    console.log(`✅ Retrieved ${approvals.length} approvals`);

    res.status(200).json({
      approvals,
      isApprover,
      userEmail,
      stats: {
        pendingApproval: approvals.filter(a => a.status === 'Pending Approval').length,
        underReview: approvals.filter(a => a.status === 'Under Review').length,
        approved: approvals.filter(a => a.status === 'Approved').length,
        rejected: approvals.filter(a => a.status === 'Rejected').length
      }
    });

  } catch (err) {
    console.error("❌ Get Approvals Error:", err);
    res.status(500).json({
      message: "Failed to fetch approvals",
      error: err.message
    });
  }
};

/**
 * Approve a master plan (APPLIES PENDING CHANGES)
 */
exports.approvePlan = async (req, res) => {
  const { planId } = req.params;
  const { comments } = req.body;
  const userEmail = req.user.email;
  const userId = req.user.id;

  console.log(`✅ Approval request for plan ${planId} by ${userEmail}`);

  let transaction;

  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Check approver permission
    if (!isAuthorizedApprover(req.user)) {
      await transaction.rollback();
      return res.status(403).json({
        message: "You are not authorized to approve plans"
      });
    }

    const deptReq = new sql.Request(transaction);
    deptReq.input("PlanId", sql.Int, planId);

    const deptCheck = await deptReq.query(`
      SELECT creator.Department
      FROM MasterPlan mp
      JOIN Users creator ON mp.UserId = creator.Id
      WHERE mp.Id = @PlanId
    `);

    if (
      deptCheck.recordset.length === 0 ||
      deptCheck.recordset[0].Department !== req.user.department
    ) {
      await transaction.rollback();
      return res.status(403).json({
        message: "You cannot approve plans outside your department"
      });
    }

    // 🆕 STEP 1: Fetch the plan with pending changes
    const planRequest = new sql.Request(transaction);
    planRequest.input("PlanId", sql.Int, planId);

    const planResult = await planRequest.query(`
      SELECT Id, Project, PendingChanges, ApprovalStatus
      FROM MasterPlan
      WHERE Id = @PlanId
    `);

    if (planResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: "Master plan not found" });
    }

    const plan = planResult.recordset[0];
    const pendingChangesJSON = plan.PendingChanges;

    if (pendingChangesJSON) {
      console.log('📝 Applying pending changes...');

      const pendingChanges = JSON.parse(pendingChangesJSON);
      const batchKey = pendingChanges.batchKey || `LEGACY_${Date.now()}`;

      // 🆕 STEP 2a: Fetch OLD data for history tracking
      const oldPlanRequest = new sql.Request(transaction);
      oldPlanRequest.input("PlanId", sql.Int, planId);

      const oldPlanResult = await oldPlanRequest.query(`
        SELECT Project, StartDate, EndDate FROM MasterPlan WHERE Id = @PlanId
      `);

      const oldPlan = oldPlanResult.recordset[0];

      const oldFieldsRequest = new sql.Request(transaction);
      oldFieldsRequest.input("PlanId", sql.Int, planId);

      const oldFieldsResult = await oldFieldsRequest.query(`
        SELECT FieldName, FieldValue, StartDate, EndDate
        FROM MasterPlanFields WHERE MasterPlanId = @PlanId
      `);

      const oldFields = {};
      oldFieldsResult.recordset.forEach(row => {
        oldFields[row.FieldName] = {
          status: row.FieldValue,
          startDate: row.StartDate,
          endDate: row.EndDate
        };
      });

      // 🆕 STEP 2b: Apply pending changes to MasterPlan
      const updateRequest = new sql.Request(transaction);
      updateRequest.input("PlanId", sql.Int, planId);
      updateRequest.input("Project", sql.NVarChar, pendingChanges.project);
      updateRequest.input("ProjectType", sql.NVarChar, pendingChanges.projectType || 'General');
      updateRequest.input("StartDate", sql.Date, pendingChanges.startDate || null);
      updateRequest.input("EndDate", sql.Date, pendingChanges.endDate || null);
      updateRequest.input("ApprovalStatus", sql.NVarChar, 'Approved');
      updateRequest.input("ApprovedBy", sql.Int, userId);
      updateRequest.input("ApprovedAt", sql.DateTime, new Date());

      await updateRequest.query(`
        UPDATE MasterPlan
        SET Project = @Project,
            ProjectType = @ProjectType,
            StartDate = @StartDate,
            EndDate = @EndDate,
            ApprovalStatus = @ApprovalStatus,
            ApprovedBy = @ApprovedBy,
            ApprovedAt = @ApprovedAt,
            PendingChanges = NULL,
            PendingChangesBy = NULL
        WHERE Id = @PlanId
      `);

      // 🆕 STEP 2c: Log project-level changes
      if (oldPlan.Project !== pendingChanges.project) {
        const historyRequest = new sql.Request(transaction);
        historyRequest.input("MasterPlanId", sql.Int, planId);
        historyRequest.input("MilestoneName", sql.NVarChar, 'Project Name');
        historyRequest.input(
          "ChangeType",
          sql.NVarChar,
          `project_renamed|${batchKey}`
        );
        historyRequest.input("OldValue", sql.NVarChar, oldPlan.Project);
        historyRequest.input("NewValue", sql.NVarChar, pendingChanges.project);
        historyRequest.input("ChangedBy", sql.Int, userId);

        await historyRequest.query(`
          INSERT INTO MasterPlanHistory (MasterPlanId, MilestoneName, ChangeType, OldValue, NewValue, ChangedBy)
          VALUES (@MasterPlanId, @MilestoneName, @ChangeType, @OldValue, @NewValue, @ChangedBy)
        `);
      }

      const oldStartDate = oldPlan.StartDate ? new Date(oldPlan.StartDate).toISOString().split('T')[0] : null;
      const oldEndDate = oldPlan.EndDate ? new Date(oldPlan.EndDate).toISOString().split('T')[0] : null;

      if (oldStartDate !== pendingChanges.startDate || oldEndDate !== pendingChanges.endDate) {
        const historyRequest = new sql.Request(transaction);
        historyRequest.input("MasterPlanId", sql.Int, planId);
        historyRequest.input("MilestoneName", sql.NVarChar, 'Project Timeline');
        historyRequest.input(
          "ChangeType",
          sql.NVarChar,
          `project_dates_changed|${batchKey}`
        );
        historyRequest.input("OldValue", sql.NVarChar, `${oldStartDate} to ${oldEndDate}`);
        historyRequest.input("NewValue", sql.NVarChar, `${pendingChanges.startDate} to ${pendingChanges.endDate}`);
        historyRequest.input("ChangedBy", sql.Int, userId);

        await historyRequest.query(`
          INSERT INTO MasterPlanHistory (MasterPlanId, MilestoneName, ChangeType, OldValue, NewValue, ChangedBy)
          VALUES (@MasterPlanId, @MilestoneName, @ChangeType, @OldValue, @NewValue, @ChangedBy)
        `);
      }

      // 🆕 STEP 2d: Delete old fields
      const deleteFieldsRequest = new sql.Request(transaction);
      deleteFieldsRequest.input("PlanId", sql.Int, planId);
      await deleteFieldsRequest.query(`
        DELETE FROM MasterPlanFields WHERE MasterPlanId = @PlanId
      `);

      // 🆕 STEP 2e: Insert new fields + log milestone changes
      const pendingFields = pendingChanges.fields || {};

      for (const [fieldName, fieldData] of Object.entries(pendingFields)) {
        const fieldRequest = new sql.Request(transaction);
        fieldRequest.input("PlanId", sql.Int, planId);
        fieldRequest.input("FieldName", sql.NVarChar, fieldName);
        fieldRequest.input("FieldValue", sql.NVarChar, fieldData?.status || "");
        fieldRequest.input("StartDate", sql.Date, fieldData?.startDate || null);
        fieldRequest.input("EndDate", sql.Date, fieldData?.endDate || null);

        await fieldRequest.query(`
          INSERT INTO MasterPlanFields (MasterPlanId, FieldName, FieldValue, StartDate, EndDate)
          VALUES (@PlanId, @FieldName, @FieldValue, @StartDate, @EndDate)
        `);

        // Log milestone history
        const oldField = oldFields[fieldName];
        const justification = pendingChanges.justifications?.[fieldName] || null;

        if (!oldField) {
          // NEW MILESTONE
          const historyRequest = new sql.Request(transaction);
          historyRequest.input("MasterPlanId", sql.Int, planId);
          historyRequest.input("MilestoneName", sql.NVarChar, fieldName);
          historyRequest.input(
            "ChangeType",
            sql.NVarChar,
            `milestone_added|${batchKey}`
          );
          historyRequest.input("OldValue", sql.NVarChar, null);
          historyRequest.input("NewValue", sql.NVarChar, `${fieldData?.status} (${fieldData?.startDate} - ${fieldData?.endDate})`);
          historyRequest.input("Justification", sql.NVarChar, justification);
          historyRequest.input("ChangedBy", sql.Int, userId);

          await historyRequest.query(`
            INSERT INTO MasterPlanHistory 
              (MasterPlanId, MilestoneName, ChangeType, OldValue, NewValue, Justification, ChangedBy)
            VALUES 
              (@MasterPlanId, @MilestoneName, @ChangeType, @OldValue, @NewValue, @Justification, @ChangedBy)
          `);
        } else {
          // CHECK FOR CHANGES
          if (oldField.status !== fieldData?.status) {
            const historyRequest = new sql.Request(transaction);
            historyRequest.input("MasterPlanId", sql.Int, planId);
            historyRequest.input("MilestoneName", sql.NVarChar, fieldName);
            historyRequest.input(
              "ChangeType",
              sql.NVarChar,
              `status_changed|${batchKey}`
            );
            historyRequest.input("OldValue", sql.NVarChar, oldField.status);
            historyRequest.input("NewValue", sql.NVarChar, fieldData?.status);
            historyRequest.input("Justification", sql.NVarChar, justification);
            historyRequest.input("ChangedBy", sql.Int, userId);

            await historyRequest.query(`
              INSERT INTO MasterPlanHistory 
                (MasterPlanId, MilestoneName, ChangeType, OldValue, NewValue, Justification, ChangedBy)
              VALUES 
                (@MasterPlanId, @MilestoneName, @ChangeType, @OldValue, @NewValue, @Justification, @ChangedBy)
            `);
          }

          const oldStart = oldField.startDate ? new Date(oldField.startDate).toISOString().split('T')[0] : null;
          const oldEnd = oldField.endDate ? new Date(oldField.endDate).toISOString().split('T')[0] : null;

          if (oldStart !== fieldData?.startDate || oldEnd !== fieldData?.endDate) {
            const historyRequest = new sql.Request(transaction);
            historyRequest.input("MasterPlanId", sql.Int, planId);
            historyRequest.input("MilestoneName", sql.NVarChar, fieldName);
            historyRequest.input(
              "ChangeType",
              sql.NVarChar,
              `dates_changed|${batchKey}`
            );
            historyRequest.input("OldValue", sql.NVarChar, `${oldStart} - ${oldEnd}`);
            historyRequest.input("NewValue", sql.NVarChar, `${fieldData?.startDate} - ${fieldData?.endDate}`);
            historyRequest.input("Justification", sql.NVarChar, justification);
            historyRequest.input("ChangedBy", sql.Int, userId);

            await historyRequest.query(`
              INSERT INTO MasterPlanHistory 
                (MasterPlanId, MilestoneName, ChangeType, OldValue, NewValue, Justification, ChangedBy)
              VALUES 
                (@MasterPlanId, @MilestoneName, @ChangeType, @OldValue, @NewValue, @Justification, @ChangedBy)
            `);
          }
        }
      }

      // Log deleted milestones
      for (const [oldFieldName, oldFieldData] of Object.entries(oldFields)) {
        if (!pendingFields[oldFieldName]) {
          const historyRequest = new sql.Request(transaction);
          historyRequest.input("MasterPlanId", sql.Int, planId);
          historyRequest.input("MilestoneName", sql.NVarChar, oldFieldName);
          historyRequest.input(
            "ChangeType",
            sql.NVarChar,
            `milestone_deleted|${batchKey}`
          );
          historyRequest.input("OldValue", sql.NVarChar,
            `${oldFieldData.status} (${oldFieldData.startDate?.toISOString().split('T')[0]} - ${oldFieldData.endDate?.toISOString().split('T')[0]})`
          );
          historyRequest.input("NewValue", sql.NVarChar, null);
          historyRequest.input("Justification", sql.NVarChar, pendingChanges.justifications?.[oldFieldName] || null);
          historyRequest.input("ChangedBy", sql.Int, userId);

          await historyRequest.query(`
            INSERT INTO MasterPlanHistory 
              (MasterPlanId, MilestoneName, ChangeType, OldValue, NewValue, Justification, ChangedBy)
            VALUES
              (@MasterPlanId, @MilestoneName, @ChangeType, @OldValue, @NewValue, @Justification, @ChangedBy)
          `);
        }
      }

      console.log('✅ Pending changes applied successfully');
    } else {
      // No pending changes, just approve (first-time approval)
      const updateRequest = new sql.Request(transaction);
      updateRequest.input("PlanId", sql.Int, planId);
      updateRequest.input("ApprovalStatus", sql.NVarChar, 'Approved');
      updateRequest.input("ApprovedBy", sql.Int, userId);
      updateRequest.input("ApprovedAt", sql.DateTime, new Date());

      await updateRequest.query(`
        UPDATE MasterPlan
        SET ApprovalStatus = @ApprovalStatus,
            ApprovedBy = @ApprovedBy,
            ApprovedAt = @ApprovedAt
        WHERE Id = @PlanId
      `);
    }

    console.log(`✅ Plan "${plan.Project}" approved by ${userEmail}`);
    await transaction.commit();

    // 🆕 SEND EMAIL TO PLAN CREATOR/EDITOR
    try {
      console.log('📧 Sending approval confirmation email...');

      // Get creator/editor info
      const creatorRequest = pool.request();
      creatorRequest.input("PlanId", sql.Int, planId);

      const creatorResult = await creatorRequest.query(`
        SELECT 
          u.Email, 
          u.FirstName, 
          u.LastName
        FROM MasterPlan mp
        LEFT JOIN Users u ON COALESCE(mp.PendingChangesBy, mp.UserId) = u.Id
        WHERE mp.Id = @PlanId
      `);

      if (creatorResult.recordset.length > 0) {
        const creator = creatorResult.recordset[0];

        await sendPlanApprovedEmail({
          planId: planId,
          projectName: plan.Project,
          approvedBy: req.user.name,
          creatorEmail: creator.Email,
          creatorName: `${creator.FirstName} ${creator.LastName}`
        });

        console.log('✅ Approval confirmation email sent');
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send approval confirmation email (non-blocking):', emailError.message);
    }

    res.status(200).json({
      message: "Master plan approved successfully",
      planId: planId,
      approvedBy: req.user.name,
      approvedAt: new Date()
    });

  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("❌ Approve Plan Error:", err);
    res.status(500).json({
      message: "Failed to approve plan",
      error: err.message
    });
  }
};

/**
 * Reject a master plan (CLEARS PENDING CHANGES + SENDS EMAIL)
 */
exports.rejectPlan = async (req, res) => {
  const { planId } = req.params;
  const { reason } = req.body;
  const userEmail = req.user.email;
  const userId = req.user.id;

  console.log(`❌ Rejection request for plan ${planId} by ${userEmail}`);

  let transaction;

  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Check approver permission
    if (!isAuthorizedApprover(req.user)) {
      await transaction.rollback();
      return res.status(403).json({
        message: "You are not authorized to reject plans"
      });
    }

    const deptReq = new sql.Request(transaction);
    deptReq.input("PlanId", sql.Int, planId);

    const deptCheck = await deptReq.query(`
      SELECT creator.Department
      FROM MasterPlan mp
      JOIN Users creator ON mp.UserId = creator.Id
      WHERE mp.Id = @PlanId
    `);

    if (
      deptCheck.recordset.length === 0 ||
      deptCheck.recordset[0].Department !== req.user.department
    ) {
      await transaction.rollback();
      return res.status(403).json({
        message: "You cannot reject plans outside your department"
      });
    }

    // Check if plan exists
    const checkRequest = new sql.Request(transaction);
    checkRequest.input("PlanId", sql.Int, planId);

    const planCheck = await checkRequest.query(`
      SELECT Id, Project, ApprovalStatus, UserId, PendingChangesBy
      FROM MasterPlan
      WHERE Id = @PlanId
    `);

    if (planCheck.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: "Master plan not found" });
    }

    const plan = planCheck.recordset[0];

    // Reject the plan and clear pending changes
    const rejectRequest = new sql.Request(transaction);
    rejectRequest.input("PlanId", sql.Int, planId);
    rejectRequest.input("RejectedBy", sql.Int, userId);
    rejectRequest.input("RejectedAt", sql.DateTime, new Date());
    rejectRequest.input("RejectionReason", sql.NVarChar, reason.trim());

    await rejectRequest.query(`
      UPDATE MasterPlan
      SET 
        ApprovalStatus = 'Rejected',
        RejectedBy = @RejectedBy,
        RejectedAt = @RejectedAt,
        RejectionReason = @RejectionReason,
        ApprovedBy = NULL,
        ApprovedAt = NULL,
        PendingChanges = NULL,
        PendingChangesBy = NULL
      WHERE Id = @PlanId
    `);

    console.log(`❌ Plan "${plan.Project}" rejected by ${userEmail}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   🆕 Pending changes cleared`);
    
    await transaction.commit();

    // ✅ SEND REJECTION EMAIL
    try {
      console.log('📧 Sending rejection email...');
      
      const creatorReq = pool.request();
      creatorReq.input("UserId", sql.Int, plan.PendingChangesBy || plan.UserId);

      const creatorResult = await creatorReq.query(`
        SELECT Email, FirstName, LastName
        FROM Users
        WHERE Id = @UserId
      `);

      if (creatorResult.recordset.length > 0) {
        const creator = creatorResult.recordset[0];

        await sendPlanRejectedEmail({
          planId: planId,
          projectName: plan.Project,
          rejectedBy: req.user.name,
          rejectionReason: reason.trim(),
          creatorEmail: creator.Email,
          creatorName: `${creator.FirstName} ${creator.LastName}`
        });

        console.log('✅ Rejection email sent successfully');
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send rejection email (non-blocking):', emailError.message);
    }

    res.status(200).json({
      message: "Master plan rejected successfully",
      planId: planId,
      rejectedBy: req.user.name,
      rejectedAt: new Date(),
      reason: reason
    });

  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("❌ Reject Plan Error:", err);
    res.status(500).json({
      message: "Failed to reject plan",
      error: err.message
    });
  }
};

/**
 * Get approval statistics
 */
exports.getApprovalStats = async (req, res) => {
  const isApprover = isAuthorizedApprover(req.user);
  const userDepartment = req.user.department;

  try {
    const pool = await getPool();

    const request = pool.request();
    request.input("UserDepartment", sql.NVarChar, userDepartment);

    const result = await request.query(`
      SELECT 
        COUNT(*) as Total,
        SUM(CASE WHEN ApprovalStatus = 'Pending Approval' THEN 1 ELSE 0 END) as PendingApproval,
        SUM(CASE WHEN ApprovalStatus = 'Under Review' THEN 1 ELSE 0 END) as UnderReview,
        SUM(CASE WHEN ApprovalStatus = 'Approved' THEN 1 ELSE 0 END) as Approved,
        SUM(CASE WHEN ApprovalStatus = 'Rejected' THEN 1 ELSE 0 END) as Rejected
      FROM MasterPlan mp
      JOIN Users creator ON mp.UserId = creator.Id
      WHERE 
        creator.Department = @UserDepartment
    `);

    const stats = result.recordset[0];

    res.status(200).json({
      total: stats.Total,
      pendingApproval: stats.PendingApproval || 0,
      underReview: stats.UnderReview || 0,
      approved: stats.Approved || 0,
      rejected: stats.Rejected || 0,
      isApprover,
      userEmail: req.user.email
    });

  } catch (err) {
    console.error("❌ Get Approval Stats Error:", err);
    res.status(500).json({
      message: "Failed to fetch approval statistics",
      error: err.message
    });
  }
};

/**
 * Get approval details for a specific plan
 */
exports.getApprovalDetails = async (req, res) => {
  const { planId } = req.params;
  const userEmail = req.user.email;
  const isApprover = isAuthorizedApprover(req.user);

  try {
    const pool = await getPool();

    const planRequest = pool.request();
    planRequest.input("PlanId", sql.Int, planId);

    const planResult = await planRequest.query(`
      SELECT 
        mp.Id,
        mp.Project,
        mp.StartDate,
        mp.EndDate,
        mp.CreatedAt,
        mp.UserId,
        mp.ApprovalStatus,
        mp.ApprovedBy,
        mp.ApprovedAt,
        mp.RejectedBy,
        mp.RejectedAt,
        mp.RejectionReason,
        creator.FirstName as CreatorFirstName,
        creator.LastName as CreatorLastName,
        creator.Email as CreatorEmail,
        creator.Department as CreatorDepartment,
        approver.FirstName as ApproverFirstName,
        approver.LastName as ApproverLastName,
        rejector.FirstName as RejectorFirstName,
        rejector.LastName as RejectorLastName
      FROM MasterPlan mp
      LEFT JOIN Users creator ON mp.UserId = creator.Id
      LEFT JOIN Users approver ON mp.ApprovedBy = approver.Id
      LEFT JOIN Users rejector ON mp.RejectedBy = rejector.Id
      WHERE mp.Id = @PlanId
    `);

    if (planResult.recordset.length === 0) {
      return res.status(404).json({ message: "Master plan not found" });
    }

    const plan = planResult.recordset[0];

    if (plan.CreatorDepartment !== req.user.department) {
      return res.status(403).json({
        message: "Access denied for this approval"
      });
    }

    // Get milestones
    const milestonesResult = await planRequest.query(`
      SELECT FieldName, FieldValue, StartDate, EndDate
      FROM MasterPlanFields
      WHERE MasterPlanId = @PlanId
      ORDER BY StartDate
    `);

    res.status(200).json({
      id: plan.Id,
      project: plan.Project,
      startDate: plan.StartDate,
      endDate: plan.EndDate,
      createdAt: plan.CreatedAt,
      createdBy: `${plan.CreatorFirstName} ${plan.CreatorLastName}`,
      createdByEmail: plan.CreatorEmail,
      status: plan.ApprovalStatus || 'Pending Approval',
      approvedBy: plan.ApproverFirstName ? `${plan.ApproverFirstName} ${plan.ApproverLastName}` : null,
      approvedAt: plan.ApprovedAt,
      rejectedBy: plan.RejectorFirstName ? `${plan.RejectorFirstName} ${plan.RejectorLastName}` : null,
      rejectedAt: plan.RejectedAt,
      rejectionReason: plan.RejectionReason,
      milestones: milestonesResult.recordset.map(m => ({
        name: m.FieldName,
        status: m.FieldValue,
        startDate: m.StartDate,
        endDate: m.EndDate
      })),
      canApprove: isApprover && plan.ApprovalStatus === 'Pending Approval',
      canReject: isApprover && plan.ApprovalStatus === 'Pending Approval',
      isApprover: isApprover
    });

  } catch (err) {
    console.error("❌ Get Approval Details Error:", err);
    res.status(500).json({
      message: "Failed to fetch approval details",
      error: err.message
    });
  }
};