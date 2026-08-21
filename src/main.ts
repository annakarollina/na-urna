import "./style.css";
import { CANDIDATE_DATASET_KIND } from "./candidates/index.ts";
import { mountApplication } from "./ui/app.ts";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("O elemento principal da aplicação não foi encontrado.");
}

const datasetKind =
  import.meta.env.MODE === "e2e"
    ? CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE
    : CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT;

mountApplication(app, undefined, datasetKind);
