import { describe, run, Chain, beforeEach, it, afterEach} from "../../../../../deps.ts";
import { Accounts, Context } from "../../../../../src/context.ts";
import { NewYorkCityCoinAuthModel } from "../../../../../models/cities/nyc/newyorkcitycoin-auth.model.ts";
import { NewYorkCityCoinTokenModel } from "../../../../../models/cities/nyc/newyorkcitycoin-token.model.ts";

let ctx: Context;
let chain: Chain;
let accounts: Accounts;
let auth: NewYorkCityCoinAuthModel;
let token: NewYorkCityCoinTokenModel;

beforeEach(() => {
  ctx = new Context();
  chain = ctx.chain;
  accounts = ctx.accounts;
  auth = ctx.models.get(NewYorkCityCoinAuthModel, "newyorkcitycoin-auth");
  token = ctx.models.get(NewYorkCityCoinTokenModel, "newyorkcitycoin-token");
})

afterEach(() => {
  ctx.terminate()
});

describe("[NewYorkCityCoin Auth]", () => {
  //////////////////////////////////////////////////
  // TOKEN MANAGEMENT
  //////////////////////////////////////////////////
  describe("TOKEN MANAGEMENT", () => {
    describe("set-token-uri()", () => {
      it("fails with ERR_UNAUTHORIZED when called by someone who is not city wallet", () => {
        // arrange
        const sender = accounts.get("wallet_2")!;
        // act
        const block = chain.mineBlock([
          auth.setTokenUri(
            sender,
            token.address,
            "http://something-something.com"
          ),
        ]);
        // assert
        const receipt = block.receipts[0];

        receipt.result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModel.ErrCode.ERR_UNAUTHORIZED);
      });
      it("fails with ERR_UNAUTHORIZED when called by someone who is not auth contract", () => {
        // arrange
        const sender = accounts.get("wallet_2")!;
        // act
        const block = chain.mineBlock([
          token.setTokenUri(sender, "http://something-something.com"),
        ]);
        // assert
        const receipt = block.receipts[0];

        receipt.result
          .expectErr()
          .expectUint(NewYorkCityCoinTokenModel.ErrCode.ERR_UNAUTHORIZED);
      });
      it("succeeds and updates token uri to none if no new value is provided", () => {
        // arrange
        const sender = accounts.get("nyc_wallet")!;
        // act
        const block = chain.mineBlock([
          auth.setTokenUri(sender, token.address),
        ]);
        // assert
        const receipt = block.receipts[0];

        receipt.result.expectOk().expectBool(true);

        const result = token.getTokenUri().result;
        result.expectOk().expectNone();
      });
      it("succeeds and updates token uri to new value if provided", () => {
        // arrange
        const sender = accounts.get("nyc_wallet")!;
        const newUri = "http://something-something.com";
        // act
        const block = chain.mineBlock([
          auth.setTokenUri(
            sender,
            token.address,
            newUri
          ),
        ]);
        // assert
        const receipt = block.receipts[0];

        receipt.result.expectOk().expectBool(true);

        const result = token.getTokenUri().result;
        result.expectOk().expectSome().expectUtf8(newUri);
      });
    });
  });

  describe("APPROVERS MANAGEMENT", () => {
    describe("execute-replace-approver-job()", () => {
      it("succeeds and replaces one approver with a new principal", () => {
        const jobId = 1;
        const approver1 = accounts.get("wallet_1")!;
        const approver2 = accounts.get("wallet_2")!;
        const approver3 = accounts.get("wallet_3")!;
        const approver4 = accounts.get("wallet_4")!;
        const newApprover = accounts.get("wallet_7")!;

        auth.isApprover(newApprover).result.expectBool(false);
        chain.mineBlock([
          auth.createJob(
            "replace approver1",
            auth.address,
            approver1
          ),
          auth.addPrincipalArgument(
            jobId,
            "oldApprover",
            approver1.address,
            approver1
          ),
          auth.addPrincipalArgument(
            jobId,
            "newApprover",
            newApprover.address,
            approver1
          ),
          auth.activateJob(jobId, approver1),
          auth.approveJob(jobId, approver1),
          auth.approveJob(jobId, approver2),
          auth.approveJob(jobId, approver3),
          auth.approveJob(jobId, approver4),
        ]);

        const receipt = chain.mineBlock([
          auth.executeReplaceApproverJob(jobId, approver1),
        ]).receipts[0];

        receipt.result.expectOk().expectBool(true);

        auth.isApprover(approver1).result.expectBool(false);
        auth.isApprover(newApprover).result.expectBool(true);
      });

      it("fails with ERR_UNAUTHORIZED if replaced/inactive approver creates or approves jobs", () => {
        const replaceApproverJobId = 1;
        const anotherJobId = 2;
        const oldApprover = accounts.get("wallet_1")!;
        const approver2 = accounts.get("wallet_2")!;
        const approver3 = accounts.get("wallet_3")!;
        const approver4 = accounts.get("wallet_4")!;
        const newApprover = accounts.get("wallet_7")!;

        auth.isApprover(newApprover).result.expectBool(false);
        chain.mineBlock([
          auth.createJob(
            "replace oldApprover",
            auth.address,
            approver2
          ),
          auth.addPrincipalArgument(
            replaceApproverJobId,
            "oldApprover",
            oldApprover.address,
            approver2
          ),
          auth.addPrincipalArgument(
            replaceApproverJobId,
            "newApprover",
            newApprover.address,
            approver2
          ),
          auth.activateJob(replaceApproverJobId, approver2),
          auth.approveJob(replaceApproverJobId, oldApprover),
          auth.approveJob(replaceApproverJobId, approver2),
          auth.approveJob(replaceApproverJobId, approver3),
          auth.approveJob(replaceApproverJobId, approver4),
          auth.executeReplaceApproverJob(
            replaceApproverJobId,
            oldApprover
          ),
          auth.createJob(
            "new job",
            auth.address,
            approver2
          ),
          auth.activateJob(anotherJobId, approver2),
        ]);

        // act
        const receipts = chain.mineBlock([
          auth.createJob(
            "test job",
            auth.address,
            oldApprover
          ),
          auth.approveJob(anotherJobId, oldApprover),
        ]).receipts;

        // assert
        receipts[0].result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModel.ErrCode.ERR_UNAUTHORIZED);
        receipts[1].result
          .expectErr()
          .expectUint(NewYorkCityCoinAuthModel.ErrCode.ERR_UNAUTHORIZED);
      });
    });
  });
});

run();
