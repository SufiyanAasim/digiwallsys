async function writeAudit(client, {
  actorUserId = null,
  action,
  resourceType,
  resourceId = null,
  metadata = {},
  ipAddress = null,
}) {
  await client.query(
    `INSERT INTO audit_logs
       (actor_userid, action, resource_type, resource_id, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [actorUserId, action, resourceType, resourceId, metadata, ipAddress]
  );
}

module.exports = { writeAudit };
