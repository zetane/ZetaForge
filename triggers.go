package pipeline

import (
	"context"
	"fmt"

	"yourpath/zjson"

	"k8s.io/client-go/kubernetes"
)

// BlockType constants
const (
    BlockTypeTrigger = "trigger"  // Add this alongside other block types
)

func registerTrigger(ctx context.Context, block *zjson.Block, k8sClient *kubernetes.Clientset) error {
    // Only process blocks of type "trigger"
    if block.Information.BlockType != BlockTypeTrigger {
        return nil
    }

    // Ensure the block has a trigger action
    if block.Action.Trigger == nil {
        return fmt.Errorf("trigger block %s missing trigger action configuration", block.Information.Id)
    }

    // Handle the trigger registration based on its type
    switch block.Action.Trigger.Type {
    case "kubernetes_cron":
        return registerCronTrigger(ctx, block, k8sClient)
    // Add other trigger types as needed
    default:
        return fmt.Errorf("unsupported trigger type: %s", block.Action.Trigger.Type)
    }
}
