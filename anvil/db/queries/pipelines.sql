-- name: ListAllPipelines :many
SELECT * FROM Pipelines
WHERE organization = ? AND deleted = FALSE
ORDER BY deployed DESC, created DESC;

-- name: ListPipelines :many
SELECT * FROM Pipelines
WHERE organization = ? AND uuid = ? AND deleted = FALSE
ORDER BY deployed DESC, created DESC;

-- name: GetPipeline :one
SELECT * FROM Pipelines
WHERE organization = ? AND uuid = ? AND hash = ? AND deleted = FALSE;

-- name: CreatePipeline :one
INSERT INTO Pipelines(
	organization, created, uuid, hash, json
) VALUES (
	?, unixepoch('now'), ?, ?, json(?)
)
RETURNING *;

-- name: SoftDeletePipeline :one
UPDATE Pipelines
SET deleted = TRUE, deployed = FALSE
WHERE organization = ? AND uuid = ? AND hash = ?
RETURNING *;

-- name: DeployPipeline :one
UPDATE Pipelines
SET deployed = TRUE
WHERE organization = ? AND uuid = ? AND hash = ? 
RETURNING *;

-- name: UndeployPipeline :one
UPDATE Pipelines
SET deployed = FALSE
WHERE organization = ? AND uuid = ? AND deployed = TRUE 
RETURNING *;
