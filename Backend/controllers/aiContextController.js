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

    const result = await sql.query(`
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