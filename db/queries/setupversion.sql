-- name: ListSetupVersions :many
SELECT * FROM SetupVersion
ORDER BY created DESC;

-- name: CreateSetupVersion :one
INSERT INTO SetupVersion(
	created, version
) VALUES (
	unixepoch('now'), ?
)
RETURNING *;