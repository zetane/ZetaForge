-- name: GetSetupVersion :one
SELECT * FROM SetupVersion
ORDER BY created DESC
LIMIT 1;

-- name: CreateSetupVersion :one
INSERT INTO SetupVersion(
	created, version
) VALUES (
	unixepoch('now'), ?
)
RETURNING *;

-- name: UpdateSetupVersion :one
UPDATE SetupVersion
SET version = ?
WHERE id = ?
RETURNING *;