const DB_NAME = "CAMexeDatabase";
const STORE_NAME = "memories";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// DATABASE OPERATIONS

async function runTransaction(mode, operation) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    let result;

    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };

    try {
      const request = operation(store);

      request.onsuccess = () => {
        result = request.result;
      };
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  });
}

// SAVE PHOTO, POLAROID OR PHOTO STRIP

export async function saveMemory(
  image,
  type = "photo",
  caption = ""
) {
  return runTransaction("readwrite", (store) =>
    store.add({
      image,
      type,
      caption,
      favorite: false,
      createdAt: new Date().toISOString(),
    })
  );
}

// SAVE VIDEO

export async function saveVideo(
  videoBlob,
  caption = "Moving Memories",
  thumbnail = "",
  duration = 0
) {
  if (!(videoBlob instanceof Blob) || !videoBlob.size) {
    throw new Error("Invalid video file");
  }

  return runTransaction("readwrite", (store) =>
    store.add({
      image: thumbnail,
      video: videoBlob,
      type: "video",
      caption,
      duration,
      mimeType: videoBlob.type,
      size: videoBlob.size,
      favorite: false,
      createdAt: new Date().toISOString(),
    })
  );
}

// GET ALL SAVED MEMORIES

export async function getMemories() {
  const memories = await runTransaction(
    "readonly",
    (store) => store.getAll()
  );

  return memories.sort(
    (a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
  );
}

// DELETE A MEMORY

export async function deleteMemory(id) {
  return runTransaction(
    "readwrite",
    (store) => store.delete(id)
  );
}

// UPDATE A MEMORY

export async function updateMemory(memory) {
  return runTransaction(
    "readwrite",
    (store) => store.put(memory)
  );
}