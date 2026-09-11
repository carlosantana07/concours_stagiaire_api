-- CreateTable
CREATE TABLE "diplome" (
    "id_diplome" TEXT NOT NULL,
    "fichier" VARCHAR(500) NOT NULL,
    "url" TEXT NOT NULL,
    "req_id" TEXT NOT NULL,
    "id_inscription" INTEGER NOT NULL,
    "date_upload" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diplome_pkey" PRIMARY KEY ("id_diplome")
);

-- AddForeignKey
ALTER TABLE "diplome" ADD CONSTRAINT "diplome_id_inscription_fkey" FOREIGN KEY ("id_inscription") REFERENCES "inscription"("id_inscription") ON DELETE CASCADE ON UPDATE NO ACTION;
