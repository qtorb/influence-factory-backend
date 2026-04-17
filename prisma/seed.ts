import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed database...');

  // ============================================================================
  // 1. CREAR O OBTENER TENANT
  // ============================================================================
  let tenant = await prisma.tenant.findUnique({
    where: { email: 'admin@rosmarops.com' },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'RosmarOps Inc',
        email: 'admin@rosmarops.com',
        subscriptionTier: 'pro',
        status: 'active',
        apiQuotaMonthly: 50000,
      },
    });
    console.log('✅ Tenant creado:', tenant.name);
  } else {
    console.log('ℹ️  Tenant ya existe:', tenant.name);
  }

  // ============================================================================
  // 2. CREAR PROYECTO ROSMAROPS (NICHE DE OPERACIONES)
  // ============================================================================
  let rosmarOpsProject = await prisma.project.findFirst({
    where: {
      tenantId: tenant.id,
      name: 'RosmarOps',
    },
  });

  if (!rosmarOpsProject) {
    rosmarOpsProject = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: 'RosmarOps',
        description: 'Operaciones y escalabilidad en SaaS',
        authorityPersona:
          'Eres un estratega de operaciones SaaS con 12 años de experiencia escalando infraestructuras de $10M a $100M ARR. Tu enfoque: automatización, métricas operacionales, y optimización de costos.',
        promptBase:
          'Genera contenido técnico profundo que demuestre autoridad operacional. Enfócate en casos de uso reales, métricas y problemas de escalabilidad que resonarán con CTOs y operadores de infraestructura. Incluye siempre cifras, benchmarks y lecciones aprendidas.',
        authorityStrategy: 'data-driven',
        status: 'active',
      },
    });
    console.log('✅ Proyecto RosmarOps creado');
  } else {
    console.log('ℹ️  Proyecto RosmarOps ya existe');
  }

  // ============================================================================
  // 3. CREAR CATEGORÍAS PARA ROSMAROPS
  // ============================================================================
  const rosmarOpsCategories = [
    {
      name: 'Research Paper',
      rules: {
        domains: ['arxiv.org', 'researchgate.net', 'scholar.google.com', 'ieee.org', 'acm.org'],
        keywords: ['research', 'study', 'experiment', 'methodology', 'peer-reviewed'],
        contentTypes: ['pdf', 'academic'],
      },
    },
    {
      name: 'Official Documentation',
      rules: {
        domains: ['kubernetes.io', 'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com', 'terraform.io', 'github.com'],
        keywords: ['documentation', 'official', 'guide', 'api', 'specification'],
        contentTypes: ['html', 'documentation'],
      },
    },
    {
      name: 'Industry Blog',
      rules: {
        domains: ['medium.com', 'dev.to', 'substack.com', 'hashnode.com'],
        keywords: ['tutorial', 'guide', 'best practices', 'lessons learned', 'case study'],
        contentTypes: ['blog', 'article'],
      },
    },
    {
      name: 'News & Analysis',
      rules: {
        domains: ['techcrunch.com', 'forbes.com', 'wired.com', 'theverge.com', 'arstechnica.com'],
        keywords: ['news', 'analysis', 'announcement', 'trend', 'report'],
        contentTypes: ['news', 'analysis'],
      },
    },
  ];

  for (const category of rosmarOpsCategories) {
    const existingCat = await prisma.category.findFirst({
      where: {
        projectId: rosmarOpsProject.id,
        name: category.name,
      },
    });

    if (!existingCat) {
      await prisma.category.create({
        data: {
          projectId: rosmarOpsProject.id,
          name: category.name,
          rules: category.rules,
        },
      });
      console.log(`✅ Categoría "${category.name}" creada para RosmarOps`);
    } else {
      console.log(`ℹ️  Categoría "${category.name}" ya existe en RosmarOps`);
    }
  }

  // ============================================================================
  // 4. CREAR SEGUNDO PROYECTO DE PRUEBA: SECURITY OPS
  // ============================================================================
  let secOpsProject = await prisma.project.findFirst({
    where: {
      tenantId: tenant.id,
      name: 'SecurityOps Lab',
    },
  });

  if (!secOpsProject) {
    secOpsProject = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: 'SecurityOps Lab',
        description: 'Seguridad en infraestructura y operaciones',
        authorityPersona:
          'Eres un arquitecto de seguridad en la nube con 10+ años en DevSecOps. Tu marca: cero confianza, automatización de seguridad, y compliance sin fricción. Hablas tanto a C-suite como a ingenieros.',
        promptBase:
          'Crea contenido que demuestre liderazgo en seguridad operacional. Referencia CVEs, estándares (SOC 2, ISO 27001), y herramientas reales. Proporciona frameworks accionables que reducen riesgo mensurable.',
        authorityStrategy: 'data-driven',
        status: 'active',
      },
    });
    console.log('✅ Proyecto SecurityOps Lab creado');
  } else {
    console.log('ℹ️  Proyecto SecurityOps Lab ya existe');
  }

  // ============================================================================
  // 5. CREAR CATEGORÍAS PARA SECOPS
  // ============================================================================
  const secOpsCategories = [
    {
      name: 'CVE Advisory',
      rules: {
        domains: ['nvd.nist.gov', 'cve.mitre.org', 'securityfocus.com'],
        keywords: ['vulnerability', 'cve', 'exploit', 'patch', 'advisory'],
        contentTypes: ['advisory', 'vulnerability'],
      },
    },
    {
      name: 'Compliance Framework',
      rules: {
        domains: ['nist.gov', 'iso.org', 'soc2.org', 'owasp.org'],
        keywords: ['compliance', 'standard', 'framework', 'audit', 'certification'],
        contentTypes: ['framework', 'standard'],
      },
    },
    {
      name: 'Tool Documentation',
      rules: {
        domains: ['falco.org', 'osquery.io', 'vault.hashicorp.com', 'github.com'],
        keywords: ['tool', 'open source', 'integration', 'setup', 'configuration'],
        contentTypes: ['documentation', 'guide'],
      },
    },
  ];

  for (const category of secOpsCategories) {
    const existingCat = await prisma.category.findFirst({
      where: {
        projectId: secOpsProject.id,
        name: category.name,
      },
    });

    if (!existingCat) {
      await prisma.category.create({
        data: {
          projectId: secOpsProject.id,
          name: category.name,
          rules: category.rules,
        },
      });
      console.log(`✅ Categoría "${category.name}" creada para SecurityOps`);
    } else {
      console.log(`ℹ️  Categoría "${category.name}" ya existe en SecurityOps`);
    }
  }

  console.log('\n✅ Seed completado exitosamente!');
  console.log('\n📊 Resumen:');
  console.log(`   ✓ Tenant: ${tenant.name}`);
  console.log(`   ✓ Proyectos: 2 (RosmarOps + SecurityOps Lab)`);
  console.log(`   ✓ Categorías RosmarOps: ${rosmarOpsCategories.length}`);
  console.log(`   ✓ Categorías SecurityOps: ${secOpsCategories.length}`);
  console.log('\n👉 Próximo paso: npm run build && npm run dev\n');
}

main()
  .catch((e) => {
    console.error('❌ Error durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });