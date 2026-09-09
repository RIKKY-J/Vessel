import { KubeConfig, AppsV1Api, CoreV1Api, NetworkingV1Api } from "@kubernetes/client-node";
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
              aws s3 cp s3://{{S3_BUCKET}}/code/service_name/ /workspace/ --recursive &&
              echo "Resources copied from S3";
          env:
            - name: AWS_ACCESS_KEY_ID
              value: "{{AWS_ACCESS_KEY_ID}}"
            - name: AWS_SECRET_ACCESS_KEY
              value: "{{AWS_SECRET_ACCESS_KEY}}"
          volumeMounts:
            - name: workspace-volume
              mountPath: /workspace
      containers:
        - name: runner
          image: rikkyj/runner:latest
          ports:
            - containerPort: 3001
            - containerPort: 3000
          volumeMounts:
            - name: workspace-volume
              mountPath: /workspace
          resources:
            requests:
              cpu: "1"
              memory: "1Gi"
            limits:
              cpu: "1"
              memory: "1Gi"
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
  - host: service_name.peetcode.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: service_name
            port:
              number: 3001
  - host: service_name.autogpt-cloud.com
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

  return { coreV1Api, appsV1Api, networkingV1Api };
}

export function parseKubeManifests(replId: string): Array<any> {
  const s3Bucket = process.env.S3_BUCKET || "repl";
  const awsKey = process.env.AWS_ACCESS_KEY_ID || "your_aws_key_id";
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY || "your_aws_secret";
  const clusterDomain = process.env.CLUSTER_DOMAIN || process.env.NEXT_PUBLIC_CLUSTER_DOMAIN || "52.90.6.151.nip.io";

  let hydrated = SERVICE_YAML_TEMPLATE
    .replace(/service_name/g, replId)
    .replace(/{{S3_BUCKET}}/g, s3Bucket)
    .replace(/{{AWS_ACCESS_KEY_ID}}/g, awsKey)
    .replace(/{{AWS_SECRET_ACCESS_KEY}}/g, awsSecret)
    .replace(/{{CLUSTER_DOMAIN}}/g, clusterDomain);

  const docs = yaml.parseAllDocuments(hydrated).map((doc) => doc.toJSON());
  return docs;
}
