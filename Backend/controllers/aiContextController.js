const { sql, getPool } = require("../db/pool");
exports.getUserAIContext = async (req, res) => {
  const userId = req.user.id;

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT
          d.Name AS DomainName,
          c.Id AS ContextId,
          c.Name AS ContextName,
          c.Purpose,
          c.AiContext,
          c.ProjectType,
          r.Id AS ResourceId,
          r.ResourceType,
          r.Identifier,
          r.Description
        FROM Users u
        JOIN UserContexts uc ON uc.UserId = u.Id
        JOIN Contexts c ON uc.ContextId = c.Id
        JOIN Domains d ON c.DomainId = d.Id
        LEFT JOIN ContextResources r ON r.ContextId = c.Id
        WHERE u.Id = @UserId
        AND d.Name = u.Department
        ORDER BY c.ProjectType, c.Name
      `);

    // 🧠 Shape for AI consumption
    const domains = {};

    for (const row of result.recordset) {
      if (!domains[row.DomainName]) {
        domains[row.DomainName] = {
          name: row.DomainName,
          contexts: {}
        };
      }

      const ctx = domains[row.DomainName].contexts;

      if (!ctx[row.ContextId]) {
        ctx[row.ContextId] = {
          id: row.ContextId,
          name: row.ContextName,
          purpose: row.Purpose,
          aiContext: row.AiContext,
          projectType: row.ProjectType,
          resources: new Map()
        };
      }

      if (row.ResourceId && row.Identifier) {
        ctx[row.ContextId].resources.set(row.ResourceId, {
          id: row.ResourceId,
          type: row.ResourceType,
          value: row.Identifier,
          description: row.Description
        });
      }
    }

    res.json({
      domains: Object.values(domains).map(d => ({
        ...d,
        contexts: Object.values(d.contexts).map(c => ({
          ...c,
          resources: Array.from(c.resources.values())
        }))
      }))
    });

  } catch (err) {
    console.error("AI Context Error:", err);
    res.status(500).json({ message: "Failed to build AI context" });
  }
};

// ==========================
// ADMIN – AI CONTEXT WRITES
// ==========================

exports.createDomain = async (req, res) => {
  const { name, description } = req.body;

  try {
    const pool = await getPool();
    await pool.request()
      .input("Name", sql.NVarChar, name)
      .input("Description", sql.NVarChar, description)
      .query(`
        INSERT INTO Domains (Name, Description)
        VALUES (@Name, @Description)
      `);

    res.json({ message: "Domain created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create domain" });
  }
};

exports.createContext = async (req, res) => {
  const { domainId, name, purpose, aiContext, projectType } = req.body;

  try {
    const pool = await getPool();
    await pool.request()
      .input("DomainId", sql.Int, domainId)
      .input("Name", sql.NVarChar, name)
      .input("Purpose", sql.NVarChar, purpose)
      .input("AiContext", sql.NVarChar, aiContext)
      .input("ProjectType", sql.NVarChar, projectType || 'Project')
      .query(`
        INSERT INTO Contexts (DomainId, Name, Purpose, AiContext, ProjectType)
        VALUES (@DomainId, @Name, @Purpose, @AiContext, @ProjectType)
      `);

    res.json({ message: "Context created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create context" });
  }
};

exports.addContextResource = async (req, res) => {
  const { contextId, resourceType, identifier, description } = req.body;

  // Validate resource type
  const validTypes = ['website', 'application', 'file_pattern'];
  if (!validTypes.includes(resourceType)) {
    return res.status(400).json({ 
      message: `Invalid resource type. Must be one of: ${validTypes.join(', ')}` 
    });
  }

  try {
    const pool = await getPool();
    await pool.request()
      .input("ContextId", sql.Int, contextId)
      .input("ResourceType", sql.NVarChar, resourceType)
      .input("Identifier", sql.NVarChar, identifier)
      .input("Description", sql.NVarChar, description)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM ContextResources
          WHERE ContextId = @ContextId AND Identifier = @Identifier
        )
        INSERT INTO ContextResources
        (ContextId, ResourceType, Identifier, Description)
        VALUES (@ContextId, @ResourceType, @Identifier, @Description)
      `);

    res.json({ message: "Resource added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add resource" });
  }
};

exports.getAdminAIStructure = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        d.Id AS DomainId,
        d.Name AS DomainName,

        c.Id AS ContextId,
        c.Name AS ContextName,
        c.Purpose,
        c.AiContext,
        c.ProjectType,

        r.Id AS ResourceId,
        r.ResourceType,
        r.Identifier,
        r.Description
      FROM Domains d
      LEFT JOIN Contexts c ON c.DomainId = d.Id
      LEFT JOIN ContextResources r ON r.ContextId = c.Id
      ORDER BY d.Name, c.ProjectType, c.Name
    `);

    const domainsMap = new Map();

    for (const row of result.recordset) {
      // Always create domain entry
      if (!domainsMap.has(row.DomainId)) {
        domainsMap.set(row.DomainId, {
          id: row.DomainId,
          name: row.DomainName,
          contextsMap: new Map()
        });
      }

      const domain = domainsMap.get(row.DomainId);

      // Only add context if it exists
      if (row.ContextId) {
        if (!domain.contextsMap.has(row.ContextId)) {
          domain.contextsMap.set(row.ContextId, {
            id: row.ContextId,
            name: row.ContextName,
            purpose: row.Purpose,
            aiContext: row.AiContext,
            projectType: row.ProjectType || 'Project',
            resourcesMap: new Map()
          });
        }

        const context = domain.contextsMap.get(row.ContextId);

        // Only add resource if it exists
        if (row.ResourceId && row.Identifier) {
          context.resourcesMap.set(row.ResourceId, {
            id: row.ResourceId,
            type: row.ResourceType,
            value: row.Identifier,
            description: row.Description
          });
        }
      }
    }

    // Convert maps to arrays
    const domains = Array.from(domainsMap.values()).map(d => ({
      id: d.id,
      name: d.name,
      contexts: Array.from(d.contextsMap.values()).map(c => ({
        id: c.id,
        name: c.name,
        purpose: c.purpose,
        aiContext: c.aiContext,
        projectType: c.projectType,
        resources: Array.from(c.resourcesMap.values())
      }))
    }));

    res.json({ domains });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load AI admin structure" });
  }
};

exports.deleteContextResource = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    await pool.request()
      .input("Id", sql.Int, id)
      .query(`
        DELETE FROM ContextResources
        WHERE Id = @Id
      `);

    res.json({ message: "Resource deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete resource" });
  }
};

// ==========================
// ADMIN – USER CONTEXT ASSIGNMENT
// ==========================

exports.clearUserContexts = async (req, res) => {
  const { userId } = req.params;

  try {
    const pool = await getPool();
    
    await pool.request()
      .input("UserId", sql.Int, userId)
      .query(`DELETE FROM UserContexts WHERE UserId = @UserId`);

    res.json({ message: "Project assignments cleared" });
  } catch (err) {
    console.error("Clear user contexts error:", err);
    res.status(500).json({ message: "Failed to clear project assignments" });
  }
};

exports.assignContextToUser = async (req, res) => {
  const { userId, contextId } = req.body;

  if (!userId || !contextId) {
    return res.status(400).json({ message: "Missing userId or contextId" });
  }

  try {
    const pool = await getPool();

    // Check if assignment already exists
    const existing = await pool.request()
      .input("UserId", sql.Int, userId)
      .input("ContextId", sql.Int, contextId)
      .query(`
        SELECT 1 FROM UserContexts
        WHERE UserId = @UserId AND ContextId = @ContextId
      `);

    if (existing.recordset.length > 0) {
      return res.status(200).json({ message: "Assignment already exists" });
    }

    // Create new assignment
    await pool.request()
      .input("UserId", sql.Int, userId)
      .input("ContextId", sql.Int, contextId)
      .query(`
        INSERT INTO UserContexts (UserId, ContextId)
        VALUES (@UserId, @ContextId)
      `);

    res.status(201).json({ message: "Project assigned successfully" });
  } catch (err) {
    console.error("Assign context error:", err);
    res.status(500).json({ message: "Failed to assign project" });
  }
};

const autoAssignUsersFromPlanToContext = async (pool, projectName, department) => {
  console.log(`🔄 Checking auto-assignment for project "${projectName}" in ${department}`);

  try {
    // 1. Find the Domain
    const domainResult = await pool.request()
      .input("department", sql.NVarChar, department)
      .query(`SELECT Id FROM Domains WHERE Name = @department`);

    if (domainResult.recordset.length === 0) {
      console.log(`   ⚠️ Domain "${department}" not found`);
      return { success: false, reason: 'domain_not_found' };
    }
    const domainId = domainResult.recordset[0].Id;

    // 2. Find the Context
    const contextResult = await pool.request()
      .input("Name", sql.NVarChar, projectName)
      .input("DomainId", sql.Int, domainId)
      .query(`SELECT Id, Purpose, AiContext FROM Contexts WHERE Name = @Name AND DomainId = @DomainId`);

    if (contextResult.recordset.length === 0) {
      console.log(`   ⚠️ Context "${projectName}" not found`);
      return { success: false, reason: 'context_not_found' };
    }

    const context = contextResult.recordset[0];
    const contextId = context.Id;

    // 3. Check if Context is "filled up" (has Purpose OR AiContext)
    const isFilled = (context.Purpose && context.Purpose.trim() !== '') || 
                     (context.AiContext && context.AiContext.trim() !== '');

    if (!isFilled) {
      console.log(`   ⏳ Context "${projectName}" not filled yet, skipping assignment`);
      return { success: false, reason: 'context_not_filled' };
    }

    // 4. Find the linked MasterPlan and check if approved
    const planResult = await pool.request()
      .input("Project", sql.NVarChar, projectName)
      .input("Department", sql.NVarChar, department)
      .query(`
        SELECT mp.Id, mp.ApprovalStatus 
        FROM MasterPlan mp
        INNER JOIN Users u ON mp.UserId = u.Id
        WHERE mp.Project = @Project AND u.Department = @Department
      `);

    if (planResult.recordset.length === 0) {
      console.log(`   ⚠️ No MasterPlan found for "${projectName}"`);
      return { success: false, reason: 'plan_not_found' };
    }

    const plan = planResult.recordset[0];
    
    if (plan.ApprovalStatus !== 'Approved') {
      console.log(`   ⏳ Plan "${projectName}" not approved yet (Status: ${plan.ApprovalStatus})`);
      return { success: false, reason: 'plan_not_approved' };
    }

    // 5. Get all users from MasterPlanPermissions
    const permissionsResult = await pool.request()
      .input("MasterPlanId", sql.Int, plan.Id)
      .query(`SELECT DISTINCT UserId FROM MasterPlanPermissions WHERE MasterPlanId = @MasterPlanId`);

    const userIds = permissionsResult.recordset.map(r => r.UserId);
    console.log(`   👥 Found ${userIds.length} users to assign from MasterPlanPermissions`);

    // 6. Insert into UserContexts (skip duplicates)
    let assigned = 0;
    let skipped = 0;

    for (const userId of userIds) {
      const existingCheck = await pool.request()
        .input("UserId", sql.Int, userId)
        .input("ContextId", sql.Int, contextId)
        .query(`SELECT Id FROM UserContexts WHERE UserId = @UserId AND ContextId = @ContextId`);

      if (existingCheck.recordset.length === 0) {
        await pool.request()
          .input("UserId", sql.Int, userId)
          .input("ContextId", sql.Int, contextId)
          .query(`INSERT INTO UserContexts (UserId, ContextId) VALUES (@UserId, @ContextId)`);
        assigned++;
        console.log(`   ✅ Assigned user ${userId} to context`);
      } else {
        skipped++;
      }
    }

    console.log(`   ✅ Auto-assignment complete: ${assigned} new, ${skipped} already existed`);
    return { success: true, assigned, skipped, contextId };

  } catch (error) {
    console.error(`   ❌ Auto-assignment error:`, error.message);
    return { success: false, reason: 'error', error: error.message };
  }
};

exports.autoAssignUsersFromPlanToContext = autoAssignUsersFromPlanToContext;

exports.updateContext = async (req, res) => {
  const { id } = req.params;
  const { purpose, aiContext, name, projectType } = req.body;

  try {
    const pool = await getPool();

    // Build dynamic update query
    const updates = [];
    const request = pool.request();
    request.input("Id", sql.Int, id);

    if (purpose !== undefined) {
      updates.push("Purpose = @Purpose");
      request.input("Purpose", sql.NVarChar, purpose);
    }
    if (aiContext !== undefined) {
      updates.push("AiContext = @AiContext");
      request.input("AiContext", sql.NVarChar, aiContext);
    }
    if (name !== undefined) {
      updates.push("Name = @Name");
      request.input("Name", sql.NVarChar, name);
    }
    if (projectType !== undefined) {
      updates.push("ProjectType = @ProjectType");
      request.input("ProjectType", sql.NVarChar, projectType);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    await request.query(`
      UPDATE Contexts
      SET ${updates.join(", ")}
      WHERE Id = @Id
    `);

    // ✅ AUTO-ASSIGN USERS IF PLAN IS APPROVED
    try {
      const contextResult = await pool.request()
        .input("ContextId", sql.Int, id)
        .query(`
          SELECT c.Name, d.Name as DomainName
          FROM Contexts c
          JOIN Domains d ON c.DomainId = d.Id
          WHERE c.Id = @ContextId
        `);

      if (contextResult.recordset.length > 0) {
        const { Name: projectName, DomainName: department } = contextResult.recordset[0];
        const result = await autoAssignUsersFromPlanToContext(pool, projectName, department);
        console.log(`📋 Context update auto-assign result:`, result);
      }
    } catch (assignError) {
      console.error('⚠️ Auto-assignment check failed (non-blocking):', assignError.message);
    }

    res.json({ message: "Context updated" });
  } catch (err) {
    console.error("Update context error:", err);
    res.status(500).json({ message: "Failed to update context" });
  }
};