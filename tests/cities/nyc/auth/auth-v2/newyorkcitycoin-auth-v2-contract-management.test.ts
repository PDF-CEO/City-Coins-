import { assertEquals, describe, types, run, Chain, beforeEach, it, afterEach} from "../../../../../deps.ts";
import { Accounts, Context } from "../../../../../src/context.ts";
import { NewYorkCityCoinAuthModelV2 } from "../../../../../models/cities/nyc/newyorkcitycoin-auth-v2.model.ts";
import { NewYorkCityCoinCoreModelV2 } from "../../../../../models/cities/nyc/newyorkcitycoin-core-v2.model.ts";

let ctx: Context;
let chain: Chain;
let accounts: Accounts;
let authV2: NewYorkCityCoinAuthModelV2;
let coreV2: NewYorkCityCoinCoreModelV2;
let coreV2_2: NewYorkCityCoinCoreModelV2;
let coreV2_3: NewYorkCityCoinCoreModelV2;

beforeEach(() => {
  ctx = new Context();
  chain = ctx.chain;
  accounts = ctx.accounts;
  authV2 = ctx.models.get(NewYorkCityCoinAuthModelV2, "newyorkcitycoin-auth-v2");
  coreV2 = ctx.models.get(NewYorkCityCoinCoreModelV2, "newyorkcitycoin-core-v2");
  coreV2_2 = ctx.models.get(NewYorkCityCoinCoreModelV2, "newyorkcitycoin-core-v2-1");
  coreV2_3 = ctx.models.get(NewYorkCityCoinCoreModelV2, "newyorkcitycoin-core-v2-2");
})

afterEach(() => {
  ctx.terminate()
});

describe("[NewYorkCityCoin Auth v2]", () => {
  //////////////////////////////////////////////////
  // CONTRACT MANAGEMENT
  //////////////////////////////////////////////////
  describe("CONTRACT MANAGEMENT", () => {
    describe("get-active-core-contract()", () => {
      it("fails with ERR_NO_ACTIVE_CORE_CONTRACT if auth contract is not initialized", () => {
        // act
        const result = authV2.getActiveCoreContract().result;

        // assert
        result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModelV2.ErrCode.ERR_NO_ACTIVE_CORE_CONTRACT);
      });
      it("succeeds and returns active core contract after auth contract is initialized", () => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const target = coreV2.address;
        chain.mineBlock([authV2.testSetActiveCoreContract(sender)]);

        // act
        const result = authV2.getActiveCoreContract().result;

        // assert
        result.expectOk().expectPrincipal(target);
      });
    });

    describe("initialize-contracts()", () => {
      it("fails with ERR_UNAUTHORIZED if not called by CONTRACT_OWNER", () => {
        // arrange
        const sender = accounts.get("wallet_2")!;
        const target = coreV2.address;

        // act
        const receipt = chain.mineBlock([
          authV2.initializeContracts(target, sender),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModelV2.ErrCode.ERR_UNAUTHORIZED);
      });

      it("fails with ERR_UNAUTHORIZED if auth contract is already initialized", () => {
        // arrange
        const sender = accounts.get("deployer")!;
        const target = coreV2.address;

        // act
        chain.mineBlock([authV2.initializeContracts(target, sender)]);

        const receipt = chain.mineBlock([
          authV2.initializeContracts(target, sender),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModelV2.ErrCode.ERR_UNAUTHORIZED);
      });

      it("succeeds and updates core contract map", () => {
        // arrange
        const sender = accounts.get("deployer")!;
        const target = coreV2.address;

        // act
        const receipt = chain.mineBlock([
          authV2.initializeContracts(target, sender),
        ]).receipts[0];

        const result = authV2.getCoreContractInfo(target).result;

        // assert
        receipt.result.expectOk();

        const expectedContractData = {
          state: types.uint(NewYorkCityCoinAuthModelV2.CoreContractState.STATE_DEPLOYED),
          startHeight: types.uint(0),
          endHeight: types.uint(0),
        };

        const actualContractData = result.expectOk().expectTuple();

        assertEquals(actualContractData, expectedContractData);
      });
    });

    describe("upgrade-core-contract()", () => {
      it("fails with ERR_CORE_CONTRACT_NOT_FOUND if principal not found in core contracts map", () => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const oldContract = coreV2.address;
        const newContract = coreV2.address;

        // act
        const receipt = chain.mineBlock([
          authV2.upgradeCoreContract(oldContract, newContract, sender),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModelV2.ErrCode.ERR_CORE_CONTRACT_NOT_FOUND);
      });

      it("fails with ERR_CONTRACT_ALREADY_EXISTS if old and new contract are the same", () => {
        // arrange
        const sender = accounts.get("nyc_wallet")!;
        const oldContract = coreV2.address;
        const newContract = coreV2.address;

        chain.mineBlock([
          coreV2.testInitializeCore(coreV2.address),
          coreV2.testSetActivationThreshold(1),
          coreV2.registerUser(sender),
        ]);

        // act
        const receipt = chain.mineBlock([
          authV2.upgradeCoreContract(oldContract, newContract, sender),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModelV2.ErrCode.ERR_CONTRACT_ALREADY_EXISTS);
      });
      it("fails with ERR_CONTRACT_ALREADY_EXISTS if called with a target contract already in core contracts map", () => {
        // arrange
        const sender = accounts.get("nyc_wallet")!;
        const oldContract = coreV2.address;
        const newContract = coreV2_2.address;

        chain.mineBlock([
          coreV2.testInitializeCore(coreV2.address),
          coreV2.testSetActivationThreshold(1),
          coreV2.registerUser(sender),
          authV2.testSetCoreContractState(newContract, NewYorkCityCoinAuthModelV2.CoreContractState.STATE_INACTIVE, sender),
        ]);

        // act
        const receipt = chain.mineBlock([
          authV2.upgradeCoreContract(oldContract, newContract, sender),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModelV2.ErrCode.ERR_CONTRACT_ALREADY_EXISTS);
      });
      it("fails with ERR_UNAUTHORIZED if not called by city wallet", () => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const oldContract = coreV2.address;
        const newContract = coreV2_2.address;

        chain.mineBlock([
          coreV2.testInitializeCore(coreV2.address),
          coreV2.testSetActivationThreshold(1),
          coreV2.registerUser(sender),
        ]);

        // act
        const receipt = chain.mineBlock([
          authV2.upgradeCoreContract(oldContract, newContract, sender),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModelV2.ErrCode.ERR_UNAUTHORIZED);
      });
      it("succeeds and updates core contract map and active variable", () => {
        // arrange
        const sender = accounts.get("nyc_wallet")!;
        const oldContract = coreV2.address;
        const newContract = coreV2_2.address;

        let activationBlock = chain.mineBlock([
          coreV2.testInitializeCore(oldContract),
          coreV2.testSetActivationThreshold(1),
          coreV2.registerUser(sender),
        ]);

        // act
        const blockUpgrade = chain.mineBlock([
          authV2.upgradeCoreContract(oldContract, newContract, sender),
        ]);

        // act
        const activeContract = authV2.getActiveCoreContract().result;
        const oldContractData =
          authV2.getCoreContractInfo(oldContract).result;
        const newContractData =
          authV2.getCoreContractInfo(newContract).result;

        // assert
        blockUpgrade.receipts[0].result.expectOk();

        activeContract.expectOk().expectPrincipal(newContract);

        const expectedOldContractData = {
          state: types.uint(NewYorkCityCoinAuthModelV2.CoreContractState.STATE_INACTIVE),
          startHeight: types.uint(activationBlock.height + NewYorkCityCoinCoreModelV2.ACTIVATION_DELAY - 1),
          endHeight: types.uint(blockUpgrade.height - 1),
        };
        const expectedNewContractData = {
          state: types.uint(NewYorkCityCoinAuthModelV2.CoreContractState.STATE_DEPLOYED),
          startHeight: types.uint(0),
          endHeight: types.uint(0),
        };
        const actualOldContractData = oldContractData.expectOk().expectTuple();
        const actualNewContractData = newContractData.expectOk().expectTuple();

        assertEquals(actualOldContractData, expectedOldContractData);
        assertEquals(actualNewContractData, expectedNewContractData);
      });
    });

    describe("execute-upgrade-core-contract-job()", () => {
      it("fails with ERR_UNAUTHORIZED if contract-caller is not an approver", () => {
        // arrange
        const jobId = 1;
        const sender = accounts.get("wallet_1")!;
        const approver1 = accounts.get("wallet_2")!;
        const approver2 = accounts.get("wallet_3")!;
        const approver3 = accounts.get("wallet_4")!;
        const invalidApprover = accounts.get("wallet_6")!;
        const oldContract = coreV2.address;
        const newContract = coreV2_2.address;

        chain.mineBlock([
          coreV2.testInitializeCore(oldContract),
          coreV2.testSetActivationThreshold(1),
          coreV2.registerUser(sender),
          authV2.createJob(
            "upgrade core",
            authV2.address,
            sender
          ),
          authV2.addPrincipalArgument(
            jobId,
            "oldContract",
            oldContract,
            sender
          ),
          authV2.addPrincipalArgument(
            jobId,
            "newContract",
            newContract,
            sender
          ),
          authV2.activateJob(jobId, sender),
          authV2.approveJob(jobId, approver1),
          authV2.approveJob(jobId, approver2),
          authV2.approveJob(jobId, approver3),
        ]);

        // act
        const blockUpgrade = chain.mineBlock([
          authV2.executeUpgradeCoreContractJob(
            jobId,
            oldContract,
            newContract,
            invalidApprover
          ),
        ]);

        // assert
        blockUpgrade.receipts[0].result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModelV2.ErrCode.ERR_UNAUTHORIZED);
      });

      it("fails with ERR_UNAUTHORIZED if submitted trait principal does not match job principal", () => {
        // arrange
        const jobId = 1;
        const sender = accounts.get("wallet_1")!;
        const approver1 = accounts.get("wallet_2")!;
        const approver2 = accounts.get("wallet_3")!;
        const approver3 = accounts.get("wallet_4")!;
        const oldContract = coreV2.address;
        const newContract = coreV2_2.address;
        const invalidContract = coreV2_3.address;

        chain.mineBlock([
          coreV2.testInitializeCore(oldContract),
          coreV2.testSetActivationThreshold(1),
          coreV2.registerUser(sender),
          authV2.createJob(
            "upgrade core",
            authV2.address,
            sender
          ),
          authV2.addPrincipalArgument(
            jobId,
            "oldContract",
            oldContract,
            sender
          ),
          authV2.addPrincipalArgument(
            jobId,
            "newContract",
            newContract,
            sender
          ),
          authV2.activateJob(jobId, sender),
          authV2.approveJob(jobId, approver1),
          authV2.approveJob(jobId, approver2),
          authV2.approveJob(jobId, approver3),
        ]);

        // act
        const blockUpgrade = chain.mineBlock([
          authV2.executeUpgradeCoreContractJob(
            jobId,
            oldContract,
            invalidContract,
            sender
          ),
        ]);

        // assert
        blockUpgrade.receipts[0].result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModelV2.ErrCode.ERR_UNAUTHORIZED);
      });

      it("fails with ERR_CONTRACT_ALREADY_EXISTS if old and new contract are the same", () => {
        // arrange
        const jobId = 1;
        const sender = accounts.get("wallet_1")!;
        const approver1 = accounts.get("wallet_2")!;
        const approver2 = accounts.get("wallet_3")!;
        const approver3 = accounts.get("wallet_4")!;
        const oldContract = coreV2.address;

        chain.mineBlock([
          coreV2.testInitializeCore(oldContract),
          coreV2.testSetActivationThreshold(1),
          coreV2.registerUser(sender),
          authV2.createJob(
            "upgrade core",
            authV2.address,
            sender
          ),
          authV2.addPrincipalArgument(
            jobId,
            "oldContract",
            oldContract,
            sender
          ),
          authV2.addPrincipalArgument(
            jobId,
            "newContract",
            oldContract,
            sender
          ),
          authV2.activateJob(jobId, sender),
          authV2.approveJob(jobId, approver1),
          authV2.approveJob(jobId, approver2),
          authV2.approveJob(jobId, approver3),
        ]);

        // act
        const blockUpgrade = chain.mineBlock([
          authV2.executeUpgradeCoreContractJob(
            jobId,
            oldContract,
            oldContract,
            sender
          ),
        ]);

        // assert
        blockUpgrade.receipts[0].result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModelV2.ErrCode.ERR_CONTRACT_ALREADY_EXISTS);
      });

      it("fails with ERR_INCORRECT_CONTRACT_STATE if new contract is not in STATE_DEPLOYED", () => {
        // arrange
        const sender = accounts.get("nyc_wallet")!;
        const contract = coreV2.address;

        chain.mineBlock([
          coreV2.testInitializeCore(contract),
          coreV2.testSetActivationThreshold(1),
          coreV2.registerUser(sender),
        ]);

        // act
        const testActive = chain.mineBlock([
          authV2.testSetCoreContractState(contract, NewYorkCityCoinAuthModelV2.CoreContractState.STATE_ACTIVE, sender),
        ]);
        const receiptActive = chain.mineBlock([
          authV2.activateCoreContract(contract, testActive.height, sender)
        ]).receipts[0];

        const testInactive = chain.mineBlock([
          authV2.testSetCoreContractState(contract, NewYorkCityCoinAuthModelV2.CoreContractState.STATE_INACTIVE, sender),
        ]);
        const receiptInactive = chain.mineBlock([
          authV2.activateCoreContract(contract, testInactive.height, sender)
        ]).receipts[0];

        // assert
        receiptActive.result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModelV2.ErrCode.ERR_INCORRECT_CONTRACT_STATE);

        receiptInactive.result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModelV2.ErrCode.ERR_INCORRECT_CONTRACT_STATE);
      });

      it("succeeds and updates core contract map and active variable", () => {
        // arrange
        const jobId = 1;
        const sender = accounts.get("wallet_1")!;
        const approver1 = accounts.get("wallet_2")!;
        const approver2 = accounts.get("wallet_3")!;
        const approver3 = accounts.get("wallet_4")!;
        const oldContract = coreV2.address;
        const newContract = coreV2_2.address;

        let activationBlock = chain.mineBlock([
          coreV2.testInitializeCore(oldContract),
          coreV2.testSetActivationThreshold(1),
          coreV2.registerUser(sender),
          authV2.createJob(
            "upgrade core",
            authV2.address,
            sender
          ),
          authV2.addPrincipalArgument(
            jobId,
            "oldContract",
            oldContract,
            sender
          ),
          authV2.addPrincipalArgument(
            jobId,
            "newContract",
            newContract,
            sender
          ),
          authV2.activateJob(jobId, sender),
          authV2.approveJob(jobId, approver1),
          authV2.approveJob(jobId, approver2),
          authV2.approveJob(jobId, approver3),
        ]);

        // act
        const blockUpgrade = chain.mineBlock([
          authV2.executeUpgradeCoreContractJob(
            jobId,
            oldContract,
            newContract,
            sender
          ),
        ]);

        // act
        const activeContract = authV2.getActiveCoreContract().result;
        const oldContractData =
          authV2.getCoreContractInfo(oldContract).result;
        const newContractData =
          authV2.getCoreContractInfo(newContract).result;

        // assert
        blockUpgrade.receipts[0].result.expectOk();

        activeContract.expectOk().expectPrincipal(newContract);

        const expectedOldContractData = {
          state: types.uint(NewYorkCityCoinAuthModelV2.CoreContractState.STATE_INACTIVE),
          startHeight: types.uint(activationBlock.height + NewYorkCityCoinCoreModelV2.ACTIVATION_DELAY - 1),
          endHeight: types.uint(blockUpgrade.height - 1),
        };
        const expectedNewContractData = {
          state: types.uint(NewYorkCityCoinAuthModelV2.CoreContractState.STATE_DEPLOYED),
          startHeight: types.uint(0),
          endHeight: types.uint(0),
        };
        const actualOldContractData = oldContractData.expectOk().expectTuple();
        const actualNewContractData = newContractData.expectOk().expectTuple();

        assertEquals(actualOldContractData, expectedOldContractData);
        assertEquals(actualNewContractData, expectedNewContractData);
      });
    });
  });
});

run();
