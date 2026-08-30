import { createInteractionCommand } from "../interaction/InteractionCommand.js";
import { INTERACTION_COMMANDS } from "../interaction/InteractionCommandTypes.js";

// ============================================================================
// OpenPalmToDeselectAdapter
//
// Maps an armed open-palm hold to DESELECT_FURNITURE intent. It emits nothing
// unless the recognizer reports an armed hold, and never emits any other
// command type.
// ============================================================================

export class OpenPalmToDeselectAdapter {
  constructor({ onCommand }) {
    if (typeof onCommand !== "function") {
      throw new Error("OpenPalmToDeselectAdapter requires an onCommand callback.");
    }
    this.onCommand = onCommand;
  }

  handleOpenPalmState(state) {
    if (!state || !state.armed) return null;
    const command = createInteractionCommand(
      INTERACTION_COMMANDS.DESELECT_FURNITURE,
      {},
    );
    this.onCommand(command);
    return command;
  }
}
