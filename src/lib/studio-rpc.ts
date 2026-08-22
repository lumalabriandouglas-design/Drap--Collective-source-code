export async function getMyStudioRpc() {
  throw new Error("rpc");
}

export async function openAtelierRpc(_opts: {
  data: { name: string; city: string; country: string; bio: string };
}) {
  throw new Error("rpc");
}

export async function listPieceRpc(_opts: { data: unknown }) {
  throw new Error("rpc");
}

export async function storageStatusRpc() {
  throw new Error("rpc");
}

export async function uploadPiecePhotoRpc(_opts: { data: unknown }) {
  throw new Error("rpc");
}
