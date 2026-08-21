import { useEffect, useRef } from "preact/hooks";

import {
  CANDIDATE_DATASET_KIND,
  type CandidateDatasetKind,
} from "../../candidates/index.ts";

export function Header({
  datasetKind,
  onAbout,
}: {
  datasetKind: CandidateDatasetKind;
  onAbout?: () => void;
}) {
  return (
    <header class="site-header">
      <div class="site-header-inner">
        <div class="header-identity">
          <a class="brand" href={import.meta.env.BASE_URL}>
            Minha Colinha
          </a>
          <span class="project-identity">Projeto independente · open source</span>
        </div>
        {onAbout ? (
          <button
            id="about-button"
            type="button"
            class="about-button"
            aria-haspopup="dialog"
            onClick={onAbout}
          >
            Sobre
          </button>
        ) : null}
      </div>
      {datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE ? (
        <div class="development-bar" role="note">
          <strong>Modo de desenvolvimento</strong> · dados fictícios, não oficiais
        </div>
      ) : null}
    </header>
  );
}

export function AboutDialog({
  open,
  onClose,
  onAnnouncement,
}: {
  open: boolean;
  onClose: () => void;
  onAnnouncement: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      class="about-dialog"
      aria-labelledby="about-title"
      onClose={() => {
        onClose();
        requestAnimationFrame(() => document.getElementById("about-button")?.focus());
      }}
      onCancel={onClose}
    >
      <div class="about-dialog-content">
        <button
          type="button"
          class="dialog-close"
          aria-label="Fechar informações sobre a Minha Colinha"
          onClick={() => dialogRef.current?.close()}
        >
          Fechar
        </button>
        <h2 id="about-title">Sobre a Minha Colinha</h2>
        <p>
          A Minha Colinha é um projeto independente e open source. Não é um site
          oficial da Justiça Eleitoral.
        </p>
        <p>
          Em produção, os candidatos vêm de dados públicos do TSE preparados
          previamente pela aplicação.
        </p>
        <h3>Privacidade, de forma simples</h3>
        <ul class="about-privacy">
          <li>Suas escolhas ficam somente na memória deste navegador.</li>
          <li>Não há cadastro, trackers ou envio da colinha para um servidor.</li>
          <li>A imagem é montada e baixada inteiramente no seu dispositivo.</li>
        </ul>
        {typeof navigator.share === "function" ? (
          <button
            type="button"
            class="secondary-button share-project"
            onClick={() => {
              const projectUrl = new URL(
                import.meta.env.BASE_URL,
                window.location.origin,
              ).toString();
              void navigator
                .share({
                  title: "Minha Colinha",
                  text: "Projeto independente para organizar sua colinha eleitoral.",
                  url: projectUrl,
                })
                .catch((error: unknown) => {
                  if (!(error instanceof Error) || error.name !== "AbortError") {
                    onAnnouncement(
                      "Não foi possível abrir o compartilhamento do projeto.",
                    );
                  }
                });
            }}
          >
            Compartilhar este projeto
          </button>
        ) : null}
      </div>
    </dialog>
  );
}

export function Footer() {
  return (
    <footer class="site-footer">
      Projeto independente e open source. Não é um site oficial da Justiça
      Eleitoral.
    </footer>
  );
}

export function UnsupportedView({ year }: { year: number }) {
  return (
    <main class="page" id="conteudo">
      <section class="intro">
        <p class="eyebrow">Ano {year}</p>
        <h1>Não há eleição configurada para este ano.</h1>
        <p class="lead">
          A aplicação não cria cargos ou regras eleitorais automaticamente. Um
          pleito só aparece depois de ser configurado e validado.
        </p>
      </section>
    </main>
  );
}
