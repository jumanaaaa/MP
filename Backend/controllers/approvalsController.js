const { sql, config } = require("../db");

// Define authorized approvers (only these emails can approve/reject)
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
 * Both approvers and regular users can view
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
        -- Count milestones
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

        // ⭐ FETCH LATEST JUSTIFICATION OR CHANGE ⭐
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

          // ⭐ SEND LATEST UPDATE + JUSTIFICATION TO FRONTEND
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
 * Approve a master plan
 * Only authorized approvers can approve
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

    // Check if plan exists and is pending
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

    // Allow re-approval - no restrictions
    // Approvers can change their decision at any time

    // Approve the plan
    const approveRequest = new sql.Request();
    approveRequest.input("PlanId", sql.Int, planId);
    approveRequest.input("ApprovedBy", sql.Int, userId);
    approveRequest.input("ApprovedAt", sql.DateTime, new Date());
    approveRequest.input("Comments", sql.NVarChar, comments || null);

    await approveRequest.query(`
      UPDATE MasterPlan
      SET 
        ApprovalStatus = 'Approved',
        ApprovedBy = @ApprovedBy,
        ApprovedAt = @ApprovedAt,
        RejectionReason = NULL,
        RejectedBy = NULL,
        RejectedAt = NULL
      WHERE Id = @PlanId
    `);

    console.log(`✅ Plan "${plan.Project}" approved by ${userEmail}`);

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
 * Reject a master plan
 * Only authorized approvers can reject
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

    // Check if plan exists and is pending
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

    // Allow re-rejection - no restrictions
    // Approvers can change their decision at any time

    // Reject the plan
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
        ApprovedAt = NULL
      WHERE Id = @PlanId
    `);

    console.log(`❌ Plan "${plan.Project}" rejected by ${userEmail}`);
    console.log(`   Reason: ${reason}`);

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
      canApprove: isApprover, // Can change decision at any time
      canReject: isApprover,  // Can change decision at any time
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