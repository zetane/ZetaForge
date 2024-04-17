package main

import (
	"context"
	"crypto/sha1"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	"server/zdatabase"
	"server/zjson"

	wfv1 "github.com/argoproj/argo-workflows/v3/pkg/apis/workflow/v1alpha1"
)

type ResponsePipeline struct {
	Organization string
	Created      int64
	Uuid         string
	Hash         string
	Json         string
	Deployed     int64
}

func newResponsePipeline(pipeline zdatabase.Pipeline) ResponsePipeline {
	return ResponsePipeline{
		Organization: pipeline.Organization,
		Created:      pipeline.Created,
		Uuid:         pipeline.Uuid,
		Hash:         pipeline.Hash,
		Json:         pipeline.Json,
		Deployed:     pipeline.Deployed,
	}
}

type ResponseExecution struct {
	Hash      string
	Status    string
	Created   int64
	Completed int64
	Json      string
}

func newResponseExecution(execution zdatabase.Execution, hash string) ResponseExecution {
	response := ResponseExecution{
		Hash:    hash,
		Status:  execution.Status.(string),
		Created: execution.Created,
	}

	if execution.Completed.Valid {
		response.Completed = execution.Completed.Int64
	}

	if execution.Json.Valid {
		response.Json = execution.Json.String
	}

	return response
}

func newResponseExecutionRow(execution zdatabase.ListExecutionsRow) ResponseExecution {
	response := ResponseExecution{
		Hash:    execution.Hash,
		Status:  execution.Status.(string),
		Created: execution.Created,
	}

	if execution.Completed.Valid {
		response.Completed = execution.Completed.Int64
	}

	if execution.Json.Valid {
		response.Json = execution.Json.String
	}

	return response
}

func createPipeline(ctx context.Context, db *sql.DB, organization string, pipeline zjson.Pipeline) (zdatabase.Pipeline, HTTPError) {
	jsonData, err := json.Marshal(pipeline)
	if err != nil {
		return zdatabase.Pipeline{}, InternalServerError{err.Error()}
	}

	hash := fmt.Sprintf("%x", sha1.Sum([]byte(jsonData)))
	log.Printf("Hash %v", hash)

	tx, err := db.Begin()
	if err != nil {
		log.Printf("Failed to initialize transaction; err=%v", err)
		return zdatabase.Pipeline{}, InternalServerError{err.Error()}
	}
	defer tx.Rollback()

	qtx := zdatabase.New(db).WithTx(tx)
	res, err := qtx.GetPipeline(ctx, zdatabase.GetPipelineParams{
		Organization: organization,
		Uuid:         pipeline.Id,
		Hash:         hash,
	})
	if err == sql.ErrNoRows {
		res, err = qtx.CreatePipeline(ctx, zdatabase.CreatePipelineParams{
			Organization: organization,
			Uuid:         pipeline.Id,
			Hash:         hash,
			Json:         jsonData,
		})
		if err != nil {
			return zdatabase.Pipeline{}, InternalServerError{err.Error()}
		}
	} else if err != nil {
		return zdatabase.Pipeline{}, InternalServerError{err.Error()}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Failed to commit transaction; err=%v", err)
		return zdatabase.Pipeline{}, InternalServerError{err.Error()}
	}

	return res, nil
}

func softDeletePipeline(ctx context.Context, db *sql.DB, organization string, uuid string, hash string) HTTPError {
	q := zdatabase.New(db)
	if _, err := q.SoftDeletePipeline(ctx, zdatabase.SoftDeletePipelineParams{
		Organization: organization,
		Uuid:         uuid,
		Hash:         hash,
	}); err != nil {
		return InternalServerError{err.Error()}
	}

	return nil
}

func listAllPipelines(ctx context.Context, db *sql.DB, organization string) ([]zdatabase.Pipeline, HTTPError) {
	q := zdatabase.New(db)
	res, err := q.ListAllPipelines(ctx, organization)
	if err != nil {
		return []zdatabase.Pipeline{}, InternalServerError{err.Error()}
	}
	return res, nil
}

func deployPipeline(ctx context.Context, db *sql.DB, organization string, uuid string, hash string) HTTPError {
	tx, err := db.Begin()
	if err != nil {
		log.Printf("Failed to initialize transaction; err=%v", err)
		return InternalServerError{err.Error()}
	}
	defer tx.Rollback()

	qtx := zdatabase.New(db).WithTx(tx)
	if _, err := qtx.UndeployPipeline(ctx, zdatabase.UndeployPipelineParams{
		Organization: organization,
		Uuid:         uuid,
	}); err != nil && err != sql.ErrNoRows {
		return InternalServerError{err.Error()}
	}

	if _, err := qtx.DeployPipeline(ctx, zdatabase.DeployPipelineParams{
		Organization: organization,
		Uuid:         uuid,
		Hash:         hash,
	}); err != nil {
		return InternalServerError{err.Error()}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Failed to commit transaction; err=%v", err)
		return InternalServerError{err.Error()}
	}

	return nil
}

func getPipeline(ctx context.Context, db *sql.DB, organization string, uuid string, hash string) (zdatabase.Pipeline, HTTPError) {
	q := zdatabase.New(db)
	res, err := q.GetPipeline(ctx, zdatabase.GetPipelineParams{
		Organization: organization,
		Uuid:         uuid,
		Hash:         hash,
	})
	if err == sql.ErrNoRows {
		return zdatabase.Pipeline{}, BadRequest{err.Error()}
	} else if err != nil {
		return zdatabase.Pipeline{}, InternalServerError{err.Error()}
	}

	return res, nil
}

func createExecution(ctx context.Context, db *sql.DB, pipeline int64, executionid string) (zdatabase.Execution, error) {
	q := zdatabase.New(db)
	return q.CreateExecution(ctx, zdatabase.CreateExecutionParams{
		Pipeline:    pipeline,
		Executionid: executionid,
	})
}

func updateExecutionWorkflow(ctx context.Context, db *sql.DB, execution int64, workflow *wfv1.Workflow) error {
	jsonWorkflow, err := json.Marshal(workflow)
	if err != nil {
		return err
	}
	q := zdatabase.New(db)
	_, err = q.AddExecutionWorkflow(ctx, zdatabase.AddExecutionWorkflowParams{
		Json: jsonWorkflow,
		ID:   execution,
	})
	return err
}

func completeExecution(ctx context.Context, db *sql.DB, execution int64) error {
	q := zdatabase.New(db)
	_, err := q.CompleteExecution(ctx, execution)
	return err
}

func updateExecutionStatus(ctx context.Context, db *sql.DB, execution int64, status string) error {
	q := zdatabase.New(db)
	_, err := q.UpdateExecutionStatus(ctx, zdatabase.UpdateExecutionStatusParams{
		ID:     execution,
		Status: status,
	})
	return err
}

func softDeleteExecution(ctx context.Context, db *sql.DB, organization string, uuid string, hash string, index int) HTTPError {
	if index < 0 {
		return BadRequest{"Negative index"}
	}

	tx, err := db.Begin()
	if err != nil {
		log.Printf("Failed to initialize transaction; err=%v", err)
		return InternalServerError{err.Error()}
	}
	defer tx.Rollback()

	qtx := zdatabase.New(db).WithTx(tx)
	res, err := qtx.ListPipelineExecutions(ctx, zdatabase.ListPipelineExecutionsParams{
		Organization: organization,
		Uuid:         uuid,
		Hash:         hash,
	})

	if err != nil {
		return InternalServerError{err.Error()}
	}

	if index >= len(res) {
		return BadRequest{"Index is larger than the number of executions"}
	}

	if _, err = qtx.SoftDeleteExecution(ctx, res[index].ID); err != nil {
		return InternalServerError{err.Error()}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Failed to commit transaction; err=%v", err)
		return InternalServerError{err.Error()}
	}

	return nil
}

func listAllExecutions(ctx context.Context, db *sql.DB, organization string, uuid string) ([]zdatabase.ListExecutionsRow, HTTPError) {
	q := zdatabase.New(db)
	res, err := q.ListExecutions(ctx, zdatabase.ListExecutionsParams{
		Organization: organization,
		Uuid:         uuid,
	})
	if err != nil {
		return []zdatabase.ListExecutionsRow{}, InternalServerError{err.Error()}
	}

	return res, nil
}

func listExecutions(ctx context.Context, db *sql.DB, organization string, uuid string, hash string) ([]zdatabase.Execution, HTTPError) {
	q := zdatabase.New(db)
	res, err := q.ListPipelineExecutions(ctx, zdatabase.ListPipelineExecutionsParams{
		Organization: organization,
		Uuid:         uuid,
		Hash:         hash,
	})
	if err != nil {
		return []zdatabase.Execution{}, InternalServerError{err.Error()}
	}

	return res, nil
}

func getExecution(ctx context.Context, db *sql.DB, organization string, uuid string, hash string, index int) (zdatabase.Execution, HTTPError) {
	if index < 0 {
		return zdatabase.Execution{}, BadRequest{"Negative index"}
	}

	tx, err := db.Begin()
	if err != nil {
		log.Printf("Failed to initialize transaction; err=%v", err)
		return zdatabase.Execution{}, InternalServerError{err.Error()}
	}
	defer tx.Rollback()

	qtx := zdatabase.New(db).WithTx(tx)
	res, err := qtx.ListPipelineExecutions(ctx, zdatabase.ListPipelineExecutionsParams{
		Organization: organization,
		Uuid:         uuid,
		Hash:         hash,
	})

	if err != nil {
		return zdatabase.Execution{}, InternalServerError{err.Error()}
	}

	if index >= len(res) {
		return zdatabase.Execution{}, BadRequest{"Index is larger than the number of executions"}
	}

	execution, err := qtx.GetExecution(ctx, res[index].ID)
	if err != nil {
		return zdatabase.Execution{}, InternalServerError{err.Error()}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Failed to commit transaction; err=%v", err)
		return zdatabase.Execution{}, InternalServerError{err.Error()}
	}

	return execution, nil
}
