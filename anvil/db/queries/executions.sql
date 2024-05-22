-- name: GetExecution :one
SELECT * FROM Executions
WHERE id = ?;

-- name: ListExecutions :many
SELECT e.*, p.hash FROM Executions e
INNER JOIN Pipelines p ON p.id = e.pipeline
WHERE organization = ? AND uuid = ? AND e.deleted = FALSE AND p.deleted = FALSE
ORDER BY e.created DESC;

-- name: ListPipelineExecutions :many
SELECT e.* FROM Executions e
INNER JOIN Pipelines p ON p.id = e.pipeline
WHERE organization = ? AND uuid = ? AND hash = ? AND e.deleted = FALSE
ORDER BY e.created DESC;

-- name: CreateExecution :one
INSERT INTO Executions(
	pipeline, executionid, created
) VALUES (
	?, ?, unixepoch('now')
)
RETURNING *;

-- name: AddExecutionWorkflow :one
UPDATE Executions
SET json = json(?)
WHERE id = ?
RETURNING *;

-- name: CompleteExecution :one
UPDATE Executions
SET completed = unixepoch('now') 
WHERE id = ? 
RETURNING *;

-- name: UpdateExecutionStatus :one
UPDATE Executions
SET status = ?
WHERE id = ?
RETURNING *;

-- name: SoftDeleteExecution :one
UPDATE Executions
SET deleted = TRUE
WHERE id = ?
RETURNING *;
