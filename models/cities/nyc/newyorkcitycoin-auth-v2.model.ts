import { Account, Tx, types } from "../../../deps.ts";
import { Model } from "../../../src/model.ts";

enum CoreContractState {
  STATE_DEPLOYED = 0,
  STATE_ACTIVE,
  STATE_INACTIVE,
}

enum ErrCode {
  ERR_UNKNOWN_JOB = 6000,
  ERR_UNAUTHORIZED,
  ERR_JOB_IS_ACTIVE,
  ERR_JOB_IS_NOT_ACTIVE,
  ERR_ALREADY_VOTED_THIS_WAY,
  ERR_JOB_IS_EXECUTED,
  ERR_JOB_IS_NOT_APPROVED,
  ERR_ARGUMENT_ALREADY_EXISTS,
  ERR_NO_ACTIVE_CORE_CONTRACT,
  ERR_CORE_CONTRACT_NOT_FOUND,
  ERR_UNKNOWN_ARGUMENT,
  ERR_INCORRECT_CONTRACT_STATE,
  ERR_CONTRACT_ALREADY_EXISTS,
}

export class NewYorkCityCoinAuthModelV2 extends Model {
  name = "newyorkcitycoin-auth-v2";

  static readonly ErrCode = ErrCode;
  static readonly CoreContractState = CoreContractState;
  static readonly REQUIRED_APPROVALS = 3;

  getLastJobId() {
    return this.callReadOnly("get-last-job-id");
  }

  createJob(name: string, target: string, sender: Account) {
    return this.callPublic(
      "create-job",
      [types.ascii(name), types.principal(target)],
      sender.address
    );
  }

  getJob(jobId: number) {
    return this.callReadOnly("get-job", [types.uint(jobId)]);
  }

  activateJob(jobId: number, sender: Account) {
    return this.callPublic(
      "activate-job",
      [types.uint(jobId)],
      sender.address
    );
  }

  approveJob(jobId: number, approver: Account): Tx {
    return this.callPublic(
      "approve-job",
      [types.uint(jobId)],
      approver.address
    );
  }

  disapproveJob(jobId: number, approver: Account) {
    return this.callPublic(
      "disapprove-job",
      [types.uint(jobId)],
      approver.address
    );
  }

  isJobApproved(jobId: number) {
    return this.callReadOnly("is-job-approved", [types.uint(jobId)]);
  }

  markJobAsExecuted(jobId: number, sender: Account) {
    return this.callPublic(
      "mark-job-as-executed",
      [types.uint(jobId)],
      sender.address
    );
  }

  addUIntArgument(
    jobId: number,
    argumentName: string,
    value: number,
    sender: Account
  ) {
    return this.callPublic(
      "add-uint-argument",
      [types.uint(jobId), types.ascii(argumentName), types.uint(value)],
      sender.address
    );
  }

  getUIntValueByName(jobId: number, argumentName: string) {
    return this.callReadOnly("get-uint-value-by-name", [
      types.uint(jobId),
      types.ascii(argumentName),
    ]);
  }

  getUIntValueById(jobId: number, argumentId: number) {
    return this.callReadOnly("get-uint-value-by-id", [
      types.uint(jobId),
      types.uint(argumentId),
    ]);
  }

  addPrincipalArgument(
    jobId: number,
    argumentName: string,
    value: string,
    sender: Account
  ) {
    return this.callPublic(
      "add-principal-argument",
      [types.uint(jobId), types.ascii(argumentName), types.principal(value)],
      sender.address
    );
  }

  getPrincipalValueByName(jobId: number, argumentName: string) {
    return this.callReadOnly("get-principal-value-by-name", [
      types.uint(jobId),
      types.ascii(argumentName),
    ]);
  }

  getPrincipalValueById(jobId: number, argumentId: number) {
    return this.callReadOnly("get-principal-value-by-id", [
      types.uint(jobId),
      types.uint(argumentId),
    ]);
  }

  getActiveCoreContract() {
    return this.callReadOnly("get-active-core-contract");
  }

  getCoreContractInfo(targetContract: string) {
    return this.callReadOnly("get-core-contract-info", [
      types.principal(targetContract),
    ]);
  }

  initializeContracts(targetContract: string, sender: Account): Tx {
    return this.callPublic(
      "initialize-contracts",
      [types.principal(targetContract)],
      sender.address
    );
  }

  activateCoreContract(
    targetContract: string,
    stacksHeight: number,
    sender: Account
  ): Tx {
    return this.callPublic(
      "activate-core-contract",
      [types.principal(targetContract), types.uint(stacksHeight)],
      sender.address
    );
  }

  upgradeCoreContract(
    oldContract: string,
    newContract: string,
    sender: Account
  ): Tx {
    return this.callPublic(
      "upgrade-core-contract",
      [types.principal(oldContract), types.principal(newContract)],
      sender.address
    );
  }

  executeUpgradeCoreContractJob(
    jobId: number,
    oldContract: string,
    newContract: string,
    sender: Account
  ): Tx {
    return this.callPublic(
      "execute-upgrade-core-contract-job",
      [
        types.uint(jobId),
        types.principal(oldContract),
        types.principal(newContract),
      ],
      sender.address
    );
  }

  getCityWallet() {
    return this.callReadOnly("get-city-wallet");
  }

  setCityWallet(
    requestor: string,
    newCityWallet: Account,
    sender: Account
  ): Tx {
    return this.callPublic(
      "set-city-wallet",
      [types.principal(requestor), types.principal(newCityWallet.address)],
      sender.address
    );
  }

  executeSetCityWalletJob(
    jobId: number,
    targetContract: string,
    sender: Account
  ): Tx {
    return this.callPublic(
      "execute-set-city-wallet-job",
      [types.uint(jobId), types.principal(targetContract)],
      sender.address
    );
  }

  setTokenUri(
    sender: Account,
    target: string,
    newUri?: string | undefined
  ): Tx {
    return this.callPublic(
      "set-token-uri",
      [
        types.principal(target),
        typeof newUri == "undefined"
          ? types.none()
          : types.some(types.utf8(newUri)),
      ],
      sender.address
    );
  }

  updateCoinbaseThresholds(sender: Account, coreContract: string, targetContract: string, threshold1: number, threshold2: number, threshold3: number, threshold4: number, threshold5: number): Tx {
    return this.callPublic(
      "update-coinbase-thresholds",
      [
        types.principal(coreContract),
        types.principal(targetContract),
        types.uint(threshold1),
        types.uint(threshold2),
        types.uint(threshold3),
        types.uint(threshold4),
        types.uint(threshold5),
      ],
      sender.address
    );
  }

  executeUpdateCoinbaseThresholdsJob(
    jobId: number,
    targetCore: string,
    targetToken: string,
    sender: Account
  ): Tx {
    return this.callPublic(
      "execute-update-coinbase-thresholds-job",
      [types.uint(jobId), types.principal(targetCore), types.principal(targetToken)],
      sender.address
    );
  }

  updateCoinbaseAmounts(sender: Account, coreContract: string, targetContract: string, amountBonus: number, amount1: number, amount2: number, amount3: number, amount4: number, amount5: number, amountDefault: number): Tx {
    return this.callPublic(
      "update-coinbase-amounts",
      [
        types.principal(coreContract),
        types.principal(targetContract),
        types.uint(amountBonus),
        types.uint(amount1),
        types.uint(amount2),
        types.uint(amount3),
        types.uint(amount4),
        types.uint(amount5),
        types.uint(amountDefault),
      ],
      sender.address
    );
  }

  executeUpdateCoinbaseAmountsJob(
    jobId: number,
    targetCore: string,
    targetToken: string,
    sender: Account
  ): Tx {
    return this.callPublic(
      "execute-update-coinbase-amounts-job",
      [types.uint(jobId), types.principal(targetCore), types.principal(targetToken)],
      sender.address
    );
  }

  isApprover(user: Account) {
    return this.callReadOnly("is-approver", [types.principal(user.address)]);
  }

  executeReplaceApproverJob(jobId: number, sender: Account): Tx {
    return this.callPublic(
      "execute-replace-approver-job",
      [types.uint(jobId)],
      sender.address
    );
  }

  testSetActiveCoreContract(sender: Account): Tx {
    return this.callPublic(
      "test-set-active-core-contract",
      [],
      sender.address
    );
  }

  testSetCoreContractState(targetContract: string, state: number, sender: Account): Tx {
    return this.callPublic(
      "test-set-core-contract-state",
      [types.principal(targetContract), types.uint(state)],
      sender.address
    );
  }
}
