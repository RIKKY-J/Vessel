import { KubeConfig, AppsV1Api, CoreV1Api, NetworkingV1Api, Exec } from "@kubernetes/client-node";
import { PassThrough } from "stream";
import yaml from "yaml";

const SERVICE_YAML_TEMPLATE = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service_name
  labels:
    app: service_name
spec:
  replicas: 1
  selector:
    matchLabels:
      app: service_name
  template:
    metadata:
      labels:
        app: service_name
    spec:
      volumes:
        - name: workspace-volume
          emptyDir: {}
      initContainers:
        - name: copy-s3-resources
          image: amazon/aws-cli
          command: ["/bin/sh", "-c"]
          args:
            - >
              echo "=== PodForge Workspace Initializer ===";
              echo "Downloading project files from s3://{{S3_BUCKET}}/code/service_name/ to /workspace/ ...";
              aws s3 cp s3://{{S3_BUCKET}}/code/service_name/ /workspace/ --recursive || true;
              if [ -z "$(ls -A /workspace 2>/dev/null)" ]; then
                echo "No project files found in S3 code folder. Fetching base template from s3://{{S3_BUCKET}}/base/{{LANGUAGE}}/ ...";
                aws s3 cp s3://{{S3_BUCKET}}/base/{{LANGUAGE}}/ /workspace/ --recursive || true;
              fi;
              echo "Workspace initialized with contents:";
              ls -la /workspace;
              echo "S3 resources sync completed successfully.";
          env:
            - name: AWS_ACCESS_KEY_ID
              value: "{{AWS_ACCESS_KEY_ID}}"
            - name: AWS_SECRET_ACCESS_KEY
              value: "{{AWS_SECRET_ACCESS_KEY}}"
            - name: AWS_DEFAULT_REGION
              value: "{{AWS_REGION}}"
            - name: AWS_REGION
              value: "{{AWS_REGION}}"
          volumeMounts:
            - name: workspace-volume
              mountPath: /workspace
      containers:
        - name: runner
          image: rikkyj/runner:latest
          ports:
            - containerPort: 3001
            - containerPort: 3000
          env:
            - name: S3_BUCKET
              value: "{{S3_BUCKET}}"
            - name: AWS_ACCESS_KEY_ID
              value: "{{AWS_ACCESS_KEY_ID}}"
            - name: AWS_SECRET_ACCESS_KEY
              value: "{{AWS_SECRET_ACCESS_KEY}}"
            - name: AWS_DEFAULT_REGION
              value: "{{AWS_REGION}}"
            - name: AWS_REGION
              value: "{{AWS_REGION}}"
            - name: S3_ENDPOINT
              value: "{{S3_ENDPOINT}}"
            - name: REPL_ID
              value: "service_name"
          volumeMounts:
            - name: workspace-volume
              mountPath: /workspace
          resources:
            requests:
              cpu: "50m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: service_name
spec:
  selector:
    app: service_name
  ports:
    - protocol: TCP
      name: ws
      port: 3001
      targetPort: 3001
    - protocol: TCP
      name: user
      port: 3000
      targetPort: 3000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: service_name
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-http-version: "1.1"
    nginx.ingress.kubernetes.io/upstream-hash-by: "$remote_addr"
    nginx.ingress.kubernetes.io/websocket-services: "service_name"
spec:
  ingressClassName: nginx
  rules:
  - host: service_name.{{CLUSTER_DOMAIN}}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: service_name
            port:
              number: 3001
  - host: service_name-app.{{CLUSTER_DOMAIN}}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: service_name
            port:
              number: 3000
  - host: service_name.100.57.92.214.nip.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: service_name
            port:
              number: 3001
  - host: service_name-app.100.57.92.214.nip.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: service_name
            port:
              number: 3000
  - host: service_name.3.88.46.132.nip.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: service_name
            port:
              number: 3001
  - host: service_name-app.3.88.46.132.nip.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: service_name
            port:
              number: 3000
`;

export function getKubeClients() {
  const kubeconfig = new KubeConfig();

  if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_TOKEN) {
    // Cloud / Vercel Serverless mode: Authenticate using ServiceAccount token
    kubeconfig.loadFromOptions({
      clusters: [
        {
          name: "eks-cluster",
          server: process.env.KUBERNETES_SERVICE_HOST,
          caData: process.env.KUBERNETES_CA_DATA,
          skipTLSVerify: !process.env.KUBERNETES_CA_DATA,
        },
      ],
      users: [
        {
          name: "vercel-orchestrator",
          token: process.env.KUBERNETES_SERVICE_TOKEN,
        },
      ],
      contexts: [
        {
          name: "eks-context",
          cluster: "eks-cluster",
          user: "vercel-orchestrator",
        },
      ],
      currentContext: "eks-context",
    });
  } else {
    // Local development mode: Authenticate using ~/.kube/config
    try {
      kubeconfig.loadFromDefault();
    } catch (err) {
      console.warn("Could not load default kubeconfig:", err);
    }
  }

  const coreV1Api = kubeconfig.makeApiClient(CoreV1Api);
  const appsV1Api = kubeconfig.makeApiClient(AppsV1Api);
  const networkingV1Api = kubeconfig.makeApiClient(NetworkingV1Api);

  return { coreV1Api, appsV1Api, networkingV1Api, kubeconfig };
}

export function parseKubeManifests(replId: string, language: string = "node-js"): Array<any> {
  const s3Bucket = process.env.S3_BUCKET || "s3-podforge";
  const awsKey = process.env.AWS_ACCESS_KEY_ID || "";
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY || "";
  const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  const s3Endpoint = process.env.S3_ENDPOINT || "https://s3.us-east-1.amazonaws.com";
  const clusterDomain = process.env.CLUSTER_DOMAIN || process.env.NEXT_PUBLIC_CLUSTER_DOMAIN || "52.90.6.151.nip.io";
  const normalizedLang = language === "python" ? "python" : "node-js";

  let hydrated = SERVICE_YAML_TEMPLATE
    .replace(/service_name/g, replId)
    .replace(/{{S3_BUCKET}}/g, s3Bucket)
    .replace(/{{AWS_ACCESS_KEY_ID}}/g, awsKey)
    .replace(/{{AWS_SECRET_ACCESS_KEY}}/g, awsSecret)
    .replace(/{{AWS_REGION}}/g, awsRegion)
    .replace(/{{S3_ENDPOINT}}/g, s3Endpoint)
    .replace(/{{LANGUAGE}}/g, normalizedLang)
    .replace(/{{CLUSTER_DOMAIN}}/g, clusterDomain);

  const docs = yaml.parseAllDocuments(hydrated).map((doc) => doc.toJSON());
  return docs;
}

export async function deleteKubeResources(replId: string, namespace: string = "default") {
  const { appsV1Api, coreV1Api, networkingV1Api } = getKubeClients();
  const results: { deployment?: string; service?: string; ingress?: string } = {};

  // 1. Delete Deployment (which terminates the pod and frees CPU/memory/workspace)
  try {
    await appsV1Api.deleteNamespacedDeployment(replId, namespace);
    results.deployment = "deleted";
    console.log(`[K8s] Deleted deployment: ${replId}`);
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.response?.statusCode === 404) {
      results.deployment = "not_found";
    } else {
      console.warn(`[K8s] Error deleting deployment ${replId}:`, err?.body?.message || err?.message);
      results.deployment = err?.body?.message || err?.message;
    }
  }

  // 2. Delete Service
  try {
    await coreV1Api.deleteNamespacedService(replId, namespace);
    results.service = "deleted";
    console.log(`[K8s] Deleted service: ${replId}`);
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.response?.statusCode === 404) {
      results.service = "not_found";
    } else {
      console.warn(`[K8s] Error deleting service ${replId}:`, err?.body?.message || err?.message);
      results.service = err?.body?.message || err?.message;
    }
  }

  // 3. Delete Ingress
  try {
    await networkingV1Api.deleteNamespacedIngress(replId, namespace);
    results.ingress = "deleted";
    console.log(`[K8s] Deleted ingress: ${replId}`);
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.response?.statusCode === 404) {
      results.ingress = "not_found";
    } else {
      console.warn(`[K8s] Error deleting ingress ${replId}:`, err?.body?.message || err?.message);
      results.ingress = err?.body?.message || err?.message;
    }
  }

  return results;
}

export async function getPodStatus(replId: string, namespace: string = "default"): Promise<{
  ready: boolean;
  phase: string;
  statusText: string;
  podName?: string;
}> {
  const { coreV1Api } = getKubeClients();
  try {
    const res = await coreV1Api.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app=${replId}`
    );

    const pod = res.body.items[0];
    if (!pod) {
      return { ready: false, phase: "Pending", statusText: "Scheduling pod on cluster..." };
    }

    const podName = pod.metadata?.name;
    const phase = pod.status?.phase || "Pending";

    // Check init containers (e.g. copy-s3-resources)
    const initStatuses = pod.status?.initContainerStatuses || [];
    for (const init of initStatuses) {
      if (!init.ready) {
        if (init.state?.waiting) {
          return { ready: false, phase: "Initializing", statusText: "Initializing workspace volume...", podName };
        }
        if (init.state?.running) {
          return { ready: false, phase: "Initializing", statusText: "Syncing project files from S3...", podName };
        }
      }
    }

    // Check main container (runner)
    const containerStatuses = pod.status?.containerStatuses || [];
    const runnerStatus = containerStatuses.find((c) => c.name === "runner") || containerStatuses[0];

    if (runnerStatus) {
      if (runnerStatus.ready) {
        return { ready: true, phase: "Running", statusText: "Sandbox pod ready!", podName };
      }
      if (runnerStatus.state?.waiting) {
        const reason = runnerStatus.state.waiting.reason || "ContainerCreating";
        return {
          ready: false,
          phase: "Starting",
          statusText: reason === "ContainerCreating" ? "Pulling container & starting runner..." : reason,
          podName,
        };
      }
      if (runnerStatus.state?.running) {
        return { ready: true, phase: "Running", statusText: "Container started, ready to connect", podName };
      }
    }

    if (phase === "Running") {
      return { ready: true, phase: "Running", statusText: "Pod running", podName };
    }

    return { ready: false, phase, statusText: `Pod in ${phase} state...`, podName };
  } catch (err: any) {
    console.warn(`[K8s] getPodStatus error for ${replId}:`, err?.body?.message || err?.message);
    return { ready: false, phase: "Unknown", statusText: "Checking sandbox status..." };
  }
}

export async function execPodCommand(
  replId: string,
  command: string,
  namespace: string = "default"
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { coreV1Api, kubeconfig } = getKubeClients();
  const res = await coreV1Api.listNamespacedPod(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `app=${replId}`
  );

  const pod = res.body.items[0];
  if (!pod || !pod.metadata?.name) {
    throw new Error(`Running sandbox pod for project "${replId}" was not found.`);
  }
  const podName = pod.metadata.name;

  const exec = new Exec(kubeconfig);
  const stdoutStream = new PassThrough();
  const stderrStream = new PassThrough();
  let stdout = "";
  let stderr = "";

  stdoutStream.on("data", (chunk: Buffer) => {
    stdout += chunk.toString("utf-8");
  });
  stderrStream.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf-8");
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve({
        stdout,
        stderr: stderr + "\n[Command timed out after 30 seconds]",
        exitCode: 124,
      });
    }, 30000);

    exec
      .exec(
        namespace,
        podName,
        "runner",
        ["/bin/sh", "-c", `cd /workspace && ${command}`],
        stdoutStream,
        stderrStream,
        null,
        false,
        (status: any) => {
          clearTimeout(timeout);
          const exitCode = status?.status === "Success" ? 0 : 1;
          resolve({ stdout, stderr, exitCode });
        }
      )
      .catch((err: any) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

export async function writeFileToPod(
  replId: string,
  filePath: string,
  content: string,
  namespace: string = "default"
): Promise<{ success: boolean; path: string; bytesWritten: number }> {
  const { coreV1Api, kubeconfig } = getKubeClients();
  const res = await coreV1Api.listNamespacedPod(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `app=${replId}`
  );

  const pod = res.body.items[0];
  if (!pod || !pod.metadata?.name) {
    throw new Error(`Running sandbox pod for project "${replId}" was not found.`);
  }
  const podName = pod.metadata.name;

  const cleanPath = filePath.replace(/^\/+/, "");
  const base64Content = Buffer.from(content, "utf-8").toString("base64");

  const exec = new Exec(kubeconfig);
  const stdoutStream = new PassThrough();
  const stderrStream = new PassThrough();
  let stderr = "";

  stderrStream.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf-8");
  });

  const nodeScript = `node -e 'const fs = require("fs"), path = require("path"), cp = require("child_process"); const p = path.resolve("/workspace", process.argv[1]); fs.mkdirSync(path.dirname(p), {recursive: true}); fs.writeFileSync(p, Buffer.from(process.argv[2], "base64")); try { const ps = cp.execSync("ps aux", {encoding: "utf-8"}); const lines = ps.split("\\n"); const hasUnwatched = lines.some(l => (l.includes("node index.js") || l.includes("node server.js") || l.includes("node app.js")) && !l.includes("--watch")); if (hasUnwatched) { cp.execSync("pkill -f \\"node index.js\\" || pkill -f \\"node server.js\\" || pkill -f \\"node app.js\\" || true"); const entryFile = fs.existsSync("/workspace/index.js") ? "index.js" : (fs.existsSync("/workspace/server.js") ? "server.js" : (fs.existsSync("/workspace/app.js") ? "app.js" : process.argv[1])); cp.spawn("node", ["--watch", entryFile], { cwd: "/workspace", detached: true, stdio: "ignore" }).unref(); } } catch (e) {}' "${cleanPath}" "${base64Content}"`;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out writing ${cleanPath} to pod ${podName} after 15 seconds`));
    }, 15000);

    exec
      .exec(
        namespace,
        podName,
        "runner",
        ["/bin/sh", "-c", nodeScript],
        stdoutStream,
        stderrStream,
        null,
        false,
        (status: any) => {
          clearTimeout(timeout);
          if (status?.status === "Success" || !status?.status) {
            resolve({
              success: true,
              path: cleanPath,
              bytesWritten: Buffer.byteLength(content, "utf-8"),
            });
          } else {
            reject(new Error(stderr || `Failed to write file: status=${status?.status}`));
          }
        }
      )
      .catch((err: any) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

