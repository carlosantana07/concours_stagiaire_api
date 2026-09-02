import { BlobServiceClient } from "@azure/storage-blob";
import { v1 as uuidv1 } from "uuid";

class AzureBlob {
  constructor() {
    this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

    this.containerName =
      process.env.AZURE_STORAGE_CONTAINER_NAME || "e-concours";

    this.blobServiceClient = null;
    this.containerClient = null;
  }

  #verifyConnectionString() {
    return this.connectionString != null && this.connectionString.trim() !== "";
  }

  static #Years() {
    return new Date().getFullYear();
  }

  async init() {
    try {
      if (!this.#verifyConnectionString()) {
        throw new Error("AZURE_STORAGE_CONNECTION_STRING introuvable");
      }

      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        this.connectionString,
      );

      this.containerClient = this.blobServiceClient.getContainerClient(
        this.containerName,
      );

      await this.containerClient.createIfNotExists();

      return {
        success: true,
        client: this.containerClient,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async Uploads(data) {
    const response = {
      error: false,
      message: "",
      success: false,
      resp: [],
    };

    try {
      if (!this.containerClient) {
        response.error = true;
        response.message = "Azure non initialisé. Appelle init() d'abord.";
        return response;
      }

      if (!data || data.length === 0) {
        response.error = true;
        response.message = "Aucune donnée reçue en entrée";
        return response;
      }

      const results = [];

      for (const d of data) {
        const blobName = "e-concours-" + AzureBlob.#Years() + "-" + uuidv1();

        const blockBlobClient =
          this.containerClient.getBlockBlobClient(blobName);

        const uploadBlobResponse = await blockBlobClient.uploadData(d.buffer);

        results.push({
          nom: blobName,
          url: blockBlobClient.url,
          requestId: uploadBlobResponse.requestId,
        });
      }

      response.success = true;
      response.resp = results;

      return response;
    } catch (err) {
      return {
        error: true,
        message: err.message,
        resp: [],
      };
    }
  }

  async Update(blobName, data) {
    const response = {
      error: false,
      message: "",
      success: false,
      resp: [],
    };

    try {
      if (!this.containerClient) {
        response.error = true;
        response.message = "Azure non initialisé. Appelle init() d'abord.";
        return response;
      }

      if (!blobName || blobName.trim() === "") {
        response.error = true;
        response.message = "Le nom du fichier est obligatoire";
        return response;
      }

      if (!data || !data.buffer) {
        response.error = true;
        response.message = "Aucune donnée reçue pour la modification";
        return response;
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      const exists = await blockBlobClient.exists();

      if (!exists) {
        response.error = true;
        response.message = "Le fichier demandé n'existe pas";
        return response;
      }

      const uploadBlobResponse = await blockBlobClient.uploadData(data.buffer);

      response.success = true;
      response.message = "Fichier modifié avec succès";

      response.resp = {
        nom: blobName,
        url: blockBlobClient.url,
        requestId: uploadBlobResponse.requestId,
      };

      return response;
    } catch (err) {
      return {
        error: true,
        message: err.message,
        success: false,
        resp: [],
      };
    }
  }

  async Delete(blobName) {
    const response = {
      error: false,
      message: "",
      success: false,
      resp: [],
    };

    try {
      if (!this.containerClient) {
        response.error = true;
        response.message = "Azure non initialisé. Appelle init() d'abord.";
        return response;
      }

      if (!blobName || blobName.trim() === "") {
        response.error = true;
        response.message = "Le nom du fichier est obligatoire";
        return response;
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      const exists = await blockBlobClient.exists();

      if (!exists) {
        response.error = true;
        response.message = "Le fichier demandé n'existe pas";
        return response;
      }

      const deleteResponse = await blockBlobClient.delete();

      response.success = true;
      response.message = "Fichier supprimé avec succès";

      response.resp = {
        nom: blobName,
        requestId: deleteResponse.requestId,
      };

      return response;
    } catch (err) {
      return {
        error: true,
        message: err.message,
        success: false,
        resp: [],
      };
    }
  }
}

export default AzureBlob;
