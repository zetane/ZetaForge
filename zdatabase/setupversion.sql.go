// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.25.0
// source: setupversion.sql

package zdatabase

import (
	"context"
)

const createSetupVersion = `-- name: CreateSetupVersion :one
INSERT INTO SetupVersion(
	created, version
) VALUES (
	unixepoch('now'), ?
)
RETURNING id, created, version
`

func (q *Queries) CreateSetupVersion(ctx context.Context, version string) (SetupVersion, error) {
	row := q.db.QueryRowContext(ctx, createSetupVersion, version)
	var i SetupVersion
	err := row.Scan(&i.ID, &i.Created, &i.Version)
	return i, err
}

const getSetupVersion = `-- name: GetSetupVersion :one
SELECT id, created, version FROM SetupVersion
ORDER BY created DESC
LIMIT 1
`

func (q *Queries) GetSetupVersion(ctx context.Context) (SetupVersion, error) {
	row := q.db.QueryRowContext(ctx, getSetupVersion)
	var i SetupVersion
	err := row.Scan(&i.ID, &i.Created, &i.Version)
	return i, err
}

const updateSetupVersion = `-- name: UpdateSetupVersion :one
UPDATE SetupVersion
SET version = ?
WHERE id = ?
RETURNING id, created, version
`

type UpdateSetupVersionParams struct {
	Version string
	ID      int64
}

func (q *Queries) UpdateSetupVersion(ctx context.Context, arg UpdateSetupVersionParams) (SetupVersion, error) {
	row := q.db.QueryRowContext(ctx, updateSetupVersion, arg.Version, arg.ID)
	var i SetupVersion
	err := row.Scan(&i.ID, &i.Created, &i.Version)
	return i, err
}
