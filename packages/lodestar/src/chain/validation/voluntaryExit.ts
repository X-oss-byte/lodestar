import {isValidVoluntaryExit, allForks} from "@chainsafe/lodestar-beacon-state-transition";
import {IBeaconConfig} from "@chainsafe/lodestar-config";
import {phase0} from "@chainsafe/lodestar-types";
import {IBeaconChain} from "..";
import {VoluntaryExitError, VoluntaryExitErrorCode} from "../errors/voluntaryExitError";
import {IBeaconDb} from "../../db";

export async function validateGossipVoluntaryExit(
  config: IBeaconConfig,
  chain: IBeaconChain,
  db: IBeaconDb,
  voluntaryExit: phase0.SignedVoluntaryExit
): Promise<void> {
  if (await db.voluntaryExit.has(voluntaryExit.message.validatorIndex)) {
    throw new VoluntaryExitError({
      code: VoluntaryExitErrorCode.EXIT_ALREADY_EXISTS,
    });
  }

  const state = await chain.regen.getCheckpointState({
    root: chain.forkChoice.getHeadRoot(),
    epoch: voluntaryExit.message.epoch,
  });

  // verifySignature = false, verified in batch below
  if (!isValidVoluntaryExit(config, state, voluntaryExit, false)) {
    throw new VoluntaryExitError({
      code: VoluntaryExitErrorCode.INVALID_EXIT,
    });
  }

  const signatureSet = allForks.getVoluntaryExitSignatureSet(state, voluntaryExit);
  if (!(await chain.bls.verifySignatureSets([signatureSet]))) {
    throw new VoluntaryExitError({
      code: VoluntaryExitErrorCode.INVALID_EXIT,
    });
  }
}
