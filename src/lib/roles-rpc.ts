export async function checkExistingPasswordRpc(_opts: {
  data: { email: string; password: string };
}) {
  return { ok: false };
}

export async function getMyRoleRpc() {
  throw new Error("rpc");
}

export async function claimRoleRpc(_opts: { data: { role: "client" | "designer" } }) {
  throw new Error("rpc");
}

export async function adminLedgerRpc() {
  throw new Error("rpc");
}
