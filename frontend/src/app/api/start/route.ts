import { NextRequest, NextResponse } from "next/server";
import { getKubeClients, parseKubeManifests } from "@/lib/k8s";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { replId } = body;

    if (!replId) {
      return NextResponse.json({ error: "replId is required" }, { status: 400 });
    }

    const namespace = "default";
    const { appsV1Api, coreV1Api, networkingV1Api } = getKubeClients();
    const kubeManifests = parseKubeManifests(replId);

    for (const manifest of kubeManifests) {
      if (!manifest || !manifest.kind) continue;

      switch (manifest.kind) {
        case "Deployment":
          await appsV1Api.createNamespacedDeployment(namespace, manifest);
          break;
        case "Service":
          await coreV1Api.createNamespacedService(namespace, manifest);
          break;
        case "Ingress":
          await networkingV1Api.createNamespacedIngress(namespace, manifest);
          break;
        default:
          console.log(`Unsupported resource kind: ${manifest.kind}`);
      }
    }

    return NextResponse.json({ message: "Resources created successfully", replId }, { status: 200 });
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
