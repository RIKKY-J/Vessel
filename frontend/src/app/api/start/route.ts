import { NextRequest, NextResponse } from "next/server";
import { getKubeClients, parseKubeManifests } from "@/lib/k8s";
import { copyS3Folder, checkS3FolderNotEmpty, normalizeLanguage } from "@/lib/aws";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { replId, language } = body;

    if (!replId) {
      return NextResponse.json({ error: "replId is required" }, { status: 400 });
    }

    const normalizedLang = normalizeLanguage(language);

    // Ensure files exist in S3 code folder before spinning up pod
    try {
      const codeExists = await checkS3FolderNotEmpty(`code/${replId}`);
      if (!codeExists) {
        console.log(`code/${replId} is empty in S3. Initializing from base/${normalizedLang}...`);
        await copyS3Folder(`base/${normalizedLang}`, `code/${replId}`);
      }
    } catch (s3Err) {
      console.warn("Could not pre-populate S3 code folder in /api/start:", s3Err);
    }

    const namespace = "default";
    const { appsV1Api, coreV1Api, networkingV1Api } = getKubeClients();
    const kubeManifests = parseKubeManifests(replId, normalizedLang);

    for (const manifest of kubeManifests) {
      if (!manifest || !manifest.kind) continue;

      try {
        switch (manifest.kind) {
          case "Deployment":
            await appsV1Api.createNamespacedDeployment(namespace, manifest);
            console.log(`[API /start] Deployment created: ${replId}`);
            break;
          case "Service":
            await coreV1Api.createNamespacedService(namespace, manifest);
            console.log(`[API /start] Service created: ${replId}`);
            break;
          case "Ingress":
            await networkingV1Api.createNamespacedIngress(namespace, manifest);
            console.log(`[API /start] Ingress created: ${replId}`);
            break;
          default:
            console.log(`Unsupported resource kind: ${manifest.kind}`);
        }
      } catch (err: any) {
        const isConflict =
          err?.statusCode === 409 ||
          err?.response?.statusCode === 409 ||
          err?.body?.code === 409 ||
          err?.message?.includes("already exists");
        if (isConflict) {
          console.log(`[API /start] ${manifest.kind} ${replId} already exists, reusing.`);
        } else {
          console.warn(`[API /start] Warning creating ${manifest.kind} ${replId}:`, err?.body?.message || err?.message);
        }
      }
    }

    return NextResponse.json(
      { message: "Resources created successfully", replId, language: normalizedLang },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Failed to create K8s resources:", error);
    // If pod already exists, or in development mode without K8s connection:
    return NextResponse.json(
      {
        message: "Resource creation attempt completed",
        error: error?.body?.message || error?.message,
      },
      { status: 500 }
    );
  }
}
