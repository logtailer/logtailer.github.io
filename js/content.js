// Single source of truth for all resume/project content.
// Update this file only — everything else renders from it.

export const content = {
  meta: {
    name: "Sumit Anand",
    title: "Site Reliability Engineer",
    promptUser: "sumit",
    promptHost: "portfolio",
    yearsExperience: 4,
  },

  contact: {
    email: "as.anandsumit@gmail.com",
    linkedin: "linkedin.com/in/asanandsumit",
    linkedinUrl: "https://www.linkedin.com/in/asanandsumit/",
    github: "github.com/logtailer",
    githubUrl: "https://github.com/logtailer",
  },

  summary:
    "Site Reliability Engineer with 4 years of experience adept at developing " +
    "robust monitoring tools, disaster recovery, and automation solutions. " +
    "Catalyzing efficiency by transforming operations with strategic automation " +
    "and ensuring high availability of systems.",

  education: [
    {
      degree: "M.Tech, Software Systems",
      school: "BITS Pilani",
      period: "July 2024 – July 2026",
    },
    {
      degree: "B.E, Computer Science Engineering",
      school: "Cambridge Institute of Technology, Bangalore",
      period: "Aug 2018 – July 2022",
    },
  ],

  experience: [
    {
      company: "Syncron Software India Pvt. Ltd, Bangalore",
      role: "Software Engineer",
      period: "Jan 2024 – Present",
      bullets: [
        "Led zero-downtime cross-account AWS Elastic IP migration for SFTP infrastructure using Python orchestration, staged NLB subnet mapping, Route53 DNS delegation, and rollback utilities.",
        "Designed CloudWatch monitoring and structured JSON logging to cover 15+ failure modes, enabling low-cardinality Prometheus metrics and multi-period alarm evaluation.",
        "Implemented custom sshpiperd SFTP proxy routing in Go and created DNS rollback, EIP detachment, and AZ coverage automation to prevent single-AZ outages.",
      ],
    },
    {
      company: "Syncron Software India Pvt. Ltd, Bangalore",
      role: "Associate Software Engineer - DevOps",
      period: "Aug 2022 – Dec 2023",
      bullets: [
        "Built custom AWS Transfer Family auth layer with Lambda and API Gateway, replacing a legacy SFTP system.",
        "Enhanced CDK/CodePipeline deployment for AWS Data.All using GitHub webhooks and automated releases.",
        "Added GitHub workflow security scans for deprecated packages, reducing risk by 30%.",
        "Provisioned Terraform for secure business onboarding and automated ECS log rotation for faster fault analysis.",
        "Strengthened EKS with FSx-backed storage and disaster recovery automation, reducing downtime by 90%.",
      ],
    },
    {
      company: "Syncron Software India Pvt. Ltd, Bangalore",
      role: "DevOps Engineer (Intern)",
      period: "Apr 2022 – July 2022",
      bullets: [
        "Launched a Lambda function to push Redshift database metrics to CloudWatch, reducing issue response time by 45%.",
        "Assisted upgrades for legacy Terraform repositories, achieving a 40% reduction in deployment time.",
      ],
    },
    {
      company: "Google Developers Student Clubs - CIT Bangalore",
      role: "DevOps and Cloud Lead",
      period: "Sept 2021 – July 2022",
      bullets: [
        "Conducted workshops on Google developer products and platforms, growing a community learning environment around hands-on technical solutions.",
      ],
    },
  ],

  skills: {
    core: ["AWS", "Azure", "Terraform", "Python", "Go", "Kubernetes", "Docker", "FastAPI", "GitHub Actions"],
    observability: ["CloudWatch", "Prometheus", "Grafana", "Loki", "Tempo", "OpenTelemetry"],
    platform: ["ArgoCD", "Karpenter", "Kyverno", "Falco", "KEDA", "Route53", "DynamoDB", "KMS", "Lambda", "SNS", "Calico", "IRSA"],
  },

  certifications: [
    {
      name: "HashiCorp Certified: Terraform Associate (003)",
      date: "Dec 2023",
      url: "https://www.credly.com/badges/814918e9-fc9f-4fde-8ea0-5df068b66902",
    },
    {
      name: "AWS Certified Cloud Practitioner",
      date: "Sept 2023",
      url: "https://www.credly.com/badges/77765962-e64e-445f-9d74-eb272f5d6923",
    },
  ],

  projects: [
    {
      slug: "project-sentinel",
      name: "project-sentinel",
      tagline: "Self-healing Kubernetes platform, dual-cloud (AWS EKS + Azure AKS).",
      details: [
        "ArgoCD GitOps, Karpenter spot autoscaling, Kyverno admission policies.",
        "Falco eBPF runtime threat detection, KEDA event-driven autoscaling.",
        "AWS FIS chaos engineering with a CI-gated 10-minute self-healing SLA.",
        "SLO burn-rate alerting via Prometheus/Alertmanager.",
        "Full Prometheus/Grafana/Loki/Tempo/OpenTelemetry observability stack.",
        "Azure side: Cilium CNI, Workload Identity, Key Vault + External Secrets.",
      ],
    },
    {
      slug: "k8s-threat-locator",
      name: "k8s-threat-locator",
      tagline: "Layered Kubernetes security architecture with automated incident response.",
      details: [
        "Trivy CVE gate in CI blocking vulnerable image pushes to ECR.",
        "Calico default-deny network policies to prevent lateral movement.",
        "IRSA least-privilege IAM — no static credentials.",
        "Falco custom rules: shell_in_container, write_to_etc, unexpected_outbound_connection.",
        "Lambda auto-quarantine responder triggered via SNS on Falco alerts.",
      ],
    },
    {
      slug: "changelens",
      name: "changelens",
      tagline: "Cloud-native change intelligence platform for SREs.",
      details: [
        "FastAPI, PostgreSQL + JSONB, Redis.",
        "Correlates deployments, config changes, and incidents into a unified timeline.",
        "Drift detection for Terraform, CloudFormation, and Pulumi.",
        "OpenTelemetry instrumented, HMAC-verified webhooks from GitHub Actions, Alertmanager, and Kubernetes audit logs.",
        "Deployed to Kubernetes with HPA autoscaling and kustomize overlays for dev/prod.",
      ],
    },
    {
      slug: "stratusfleet",
      name: "stratusfleet",
      tagline: "Cloud-agnostic multi-cluster Kubernetes fleet manager, written in Go.",
      details: [
        "Kubernetes operator using controller-runtime (kubebuilder pattern).",
        "Four custom CRDs: Cluster, ClusterTemplate, PolicyBundle, Rollout.",
        "gRPC management server; outbound tunnel agents for firewall-transparent registration.",
        "envtest-based reconciler tests for all four CRDs; Helm chart packaging.",
      ],
    },
    {
      slug: "azure-automation-suite",
      name: "azure-automation-suite",
      tagline: "15-module production-ready Azure platform engineering suite in Terraform.",
      details: [
        "AKS, Key Vault, Defender for Containers, Log Analytics + Grafana observability.",
        "ArgoCD GitOps, Backstage developer portal, Azure ARC runners.",
        "Azure Policy governance, cost management budgets, Application Gateway WAF.",
        "Traffic Manager multi-region failover with health probing.",
      ],
    },
  ],
};
