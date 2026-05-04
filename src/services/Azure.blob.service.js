import dotenv from "dotenv";
dotenv.config();

import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { v1 as uuidv1 } from "uuid";

class AzureBlob {
  constructor() {
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    this.containerName = "e-concours";

    this.blobServiceClient = null;
    this.containerClient = null;
  }

  #verifyAccount() {
    return this.accountName != null && this.accountName.trim() !== "";
  }

  static #Years() {
    return new Date().getFullYear();
  }

  // initialisation....

  async init() {
    try {
      if (!this.#verifyAccount()) {
        throw new Error("Compte Azure storage introuvable");
      }

      this.blobServiceClient = new BlobServiceClient(
        `https://${this.accountName}.blob.core.windows.net`,
        new DefaultAzureCredential(),
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

  // uploads des fichiers dans azure blob
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
        response.message = "aucune donnée reçue en entrée";
        return response;
      }

      let results = [];

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
      };
    }
  }

  // generer un access url pour que le admin puisse visionner les documents associer a chaque utilisateur
  // la methode neccessite encore des amelioration raison pour laquelle elle est mise en commmentaire

  //   generateAccessUrl(containerClient, blobName) {
  //   const blobClient = containerClient.getBlobClient(blobName);

  //   const sas = generateBlobSASQueryParameters(
  //     {
  //       containerName: containerClient.containerName,
  //       blobName,
  //       permissions: BlobSASPermissions.parse("r"),
  //       expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1h
  //     },
  //     this.blobServiceClient.credential
  //   ).toString();

  //   return `${blobClient.url}?${sas}`;
  // }
}

export default AzureBlob;
