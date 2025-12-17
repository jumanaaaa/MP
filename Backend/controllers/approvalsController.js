const { sql, config } = require("../db");

// Define authorized approvers
const AUTHORIZED_APPROVERS = [
  'muhammad.hasan@ihrp.sg',
  'jumana.haseen@ihrp.sg'
];

/**
 * Check if user is authorized to approve plans
 */
const isAuthorizedApprover = (userEmail) => {
  return AUTHORIZED_APPROVERS.includes(userEmail.toLowerCase());
};

/**
 * Get all master plans with approval status
 */
exports.getAllApprovals = async (req, res) => {
  const userEmail = req.user.email;
  const isApprover = isAuthorizedApprover(userEmail);

  console.log(`📋 Fetching approvals for user: ${userEmail} (Approver: ${isApprover})`);

  try {
    await sql.connect(config);

    const result = await sql.query(`
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
        rejector.LastName as RejectorLastName,
        (SELECT COUNT(*) FROM MasterPlanFields WHERE MasterPlanId = mp.Id) as MilestoneCount
      FROM MasterPlan mp
      LEFT JOIN Users creator ON mp.UserId = creator.Id
      LEFT JOIN Users approver ON mp.ApprovedBy = approver.Id
      LEFT JOIN Users rejector ON mp.RejectedBy = rejector.Id
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
        const latestHistoryQuery = await sql.query(`
          SELECT TOP 1 
            MilestoneName, 
            OldValue, 
            NewValue, 
            Justification, 
            ChangedAt
          FROM MasterPlanHistory
          WHERE MasterPlanId = ${row.Id}
            AND ChangeType IN (
              'status_changed',
              'dates_changed',
              'milestone_added',
              'milestone_deleted'
            )
          ORDER BY ChangedAt DESC
        `);

        const latestHistory = latestHistoryQuery.recordset[0] || null;

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
          latestUpdate: latestHistory
            ? {
              milestone: latestHistory.MilestoneName,
              oldValue: latestHistory.OldValue,
              newValue: latestHistory.NewValue,
              justification: latestHistory.Justification,
              changedAt: latestHistory.ChangedAt
            }
            : null,
          approvedBy: row.ApproverFirstName ? `${row.ApproverFirstName} ${row.ApproverLastName}` : null,
          approvedAt: row.ApprovedAt,
          rejectedBy: row.RejectorFirstName ? `${row.RejectorFirstName} ${row.RejectorLastName}` : null,
          rejectedAt: row.RejectedAt,
          rejectionReason: row.RejectionReason,
          canApprove: isApprover,
          canReject: isApprover,
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

  // Check if user is authorized
  if (!isAuthorizedApprover(userEmail)) {
    console.log(`❌ Unauthorized approval attempt by ${userEmail}`);
    return res.status(403).json({
      message: "You are not authorized to approve plans. Only designated approvers can approve plans.",
      authorizedApprovers: AUTHORIZED_APPROVERS
    });
  }

  try {
    await sql.connect(config);
    const transaction = new sql.Transaction();
    await transaction.begin();

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
        historyRequest.input("ChangeType", sql.NVarChar, 'project_renamed');
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
        historyRequest.input("ChangeType", sql.NVarChar, 'project_dates_changed');
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
          historyRequest.input("ChangeType", sql.NVarChar, 'milestone_added');
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
            historyRequest.input("ChangeType", sql.NVarChar, 'status_changed');
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
            historyRequest.input("ChangeType", sql.NVarChar, 'dates_changed');
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
          historyRequest.input("ChangeType", sql.NVarChar, 'milestone_deleted');
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

    await transaction.commit();
    console.log(`✅ Plan "${plan.Project}" approved by ${userEmail}`);

    res.status(200).json({
      message: "Master plan approved successfully",
      planId: planId,
      approvedBy: req.user.name,
      approvedAt: new Date()
    });

    await transaction.commit();
    console.log(`✅ Plan "${plan.Project}" approved by ${userEmail}`);

    // 🆕 SEND EMAIL TO PLAN CREATOR/EDITOR
    try {
      console.log('📧 Sending approval confirmation email...');

      // Get creator/editor info
      const creatorRequest = new sql.Request();
      creatorRequest.input("PlanId", sql.Int, planId);

      const creatorResult = await creatorRequest.query(`
    SELECT 
      u.Email, 
      u.FirstName, 
      u.LastName
    FROM MasterPlan mp
    LEFT JOIN Users u ON mp.PendingChangesBy = u.Id OR mp.UserId = u.Id
    WHERE mp.Id = @PlanId
  `);

      if (creatorResult.recordset.length > 0) {
        const creator = creatorResult.recordset[0];

        await fetch('http://localhost:3000/plan/master/plan-approved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: planId,
            projectName: plan.Project,
            approvedBy: `${req.user.firstName} ${req.user.lastName}`,
            creatorEmail: creator.Email,
            creatorName: `${creator.FirstName} ${creator.LastName}`
          })
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
    console.error("❌ Approve Plan Error:", err);
    res.status(500).json({
      message: "Failed to approve plan",
      error: err.message
    });
  }
};

/**
 * Reject a master plan (CLEARS PENDING CHANGES)
 */
exports.rejectPlan = async (req, res) => {
  const { planId } = req.params;
  const { reason } = req.body;
  const userEmail = req.user.email;
  const userId = req.user.id;

  console.log(`❌ Rejection request for plan ${planId} by ${userEmail}`);

  // Check if user is authorized
  if (!isAuthorizedApprover(userEmail)) {
    console.log(`❌ Unauthorized rejection attempt by ${userEmail}`);
    return res.status(403).json({
      message: "You are not authorized to reject plans. Only designated approvers can reject plans.",
      authorizedApprovers: AUTHORIZED_APPROVERS
    });
  }

  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({
      message: "Rejection reason is required"
    });
  }

  try {
    await sql.connect(config);

    // Check if plan exists
    const checkRequest = new sql.Request();
    checkRequest.input("PlanId", sql.Int, planId);

    const planCheck = await checkRequest.query(`
      SELECT Id, Project, ApprovalStatus, UserId
      FROM MasterPlan
      WHERE Id = @PlanId
    `);

    if (planCheck.recordset.length === 0) {
      return res.status(404).json({ message: "Master plan not found" });
    }

    const plan = planCheck.recordset[0];

    // Reject the plan and clear pending changes
    const rejectRequest = new sql.Request();
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

    res.status(200).json({
      message: "Master plan rejected successfully",
      planId: planId,
      rejectedBy: req.user.name,
      rejectedAt: new Date(),
      reason: reason
    });

  } catch (err) {
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
  const userEmail = req.user.email;
  const isApprover = isAuthorizedApprover(userEmail);

  try {
    await sql.connect(config);

    const result = await sql.query(`
      SELECT 
        COUNT(*) as Total,
        SUM(CASE WHEN ApprovalStatus = 'Pending Approval' THEN 1 ELSE 0 END) as PendingApproval,
        SUM(CASE WHEN ApprovalStatus = 'Under Review' THEN 1 ELSE 0 END) as UnderReview,
        SUM(CASE WHEN ApprovalStatus = 'Approved' THEN 1 ELSE 0 END) as Approved,
        SUM(CASE WHEN ApprovalStatus = 'Rejected' THEN 1 ELSE 0 END) as Rejected
      FROM MasterPlan
    `);

    const stats = result.recordset[0];

    res.status(200).json({
      total: stats.Total,
      pendingApproval: stats.PendingApproval || 0,
      underReview: stats.UnderReview || 0,
      approved: stats.Approved || 0,
      rejected: stats.Rejected || 0,
      isApprover: isApprover,
      userEmail: userEmail
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
  const isApprover = isAuthorizedApprover(userEmail);

  try {
    await sql.connect(config);

    const planRequest = new sql.Request();
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
      canApprove: isApprover,
      canReject: isApprover,
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