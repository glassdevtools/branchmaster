import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createRepoListStore } from "../src/main/repoListStore";

const withUserDataPath = async (
  runTest: (userDataPath: string) => Promise<void>,
) => {
  const userDataPath = await mkdtemp(join(tmpdir(), "branchtracker-repo-list-"));

  try {
    await runTest(userDataPath);
  } finally {
    await rm(userDataPath, { recursive: true, force: true });
  }
};

test("repo list starts empty and without auto-detection", async () => {
  await withUserDataPath(async (userDataPath) => {
    const repoListStore = createRepoListStore({ userDataPath });
    const repoList = await repoListStore.readRepoList();

    assert.deepEqual(repoList, {
      didAutoDetectChatProviderRepos: false,
      repoRoots: [],
    });
  });
});

test("repo list adds unique roots, removes roots, and persists to disk", async () => {
  await withUserDataPath(async (userDataPath) => {
    const repoListStore = createRepoListStore({ userDataPath });

    await repoListStore.addRepoRoots(["/repos/a", "/repos/b", "/repos/a"]);
    await repoListStore.addRepoRoots(["/repos/b", "/repos/c"]);
    await repoListStore.removeRepoRoot("/repos/b");
    await repoListStore.markDidAutoDetectChatProviderRepos();

    const repoList = await repoListStore.readRepoList();

    assert.deepEqual(repoList, {
      didAutoDetectChatProviderRepos: true,
      repoRoots: ["/repos/a", "/repos/c"],
    });

    const storedRepoList = JSON.parse(
      await readFile(join(userDataPath, "repo-list.json"), "utf8"),
    );

    assert.deepEqual(storedRepoList, repoList);

    const reloadedRepoListStore = createRepoListStore({ userDataPath });

    assert.deepEqual(await reloadedRepoListStore.readRepoList(), repoList);
  });
});

test("repo list treats a corrupted file as empty", async () => {
  await withUserDataPath(async (userDataPath) => {
    await writeFile(join(userDataPath, "repo-list.json"), "not json\n");

    const repoListStore = createRepoListStore({ userDataPath });

    assert.deepEqual(await repoListStore.readRepoList(), {
      didAutoDetectChatProviderRepos: false,
      repoRoots: [],
    });
  });
});
