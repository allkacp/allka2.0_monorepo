// One-off seed: real Coupon rows + CouponUsage rows + extra PartnerCommission
// rows tied to existing campaigns, so admin/campanhas-indicacao shows real,
// non-zero derived numbers (referrals, totals paid, coupon usage) instead of
// empty stat cards. Safe to re-run — skips rows that already exist.
import { prisma } from "../lib/prisma";

async function main() {
  const campaigns = await prisma.campaign.findMany({ orderBy: { created_at: "asc" } });
  const partners = await prisma.partnerProfile.findMany({ include: { user: true } });
  const companies = await prisma.company.findMany({ take: 10 });

  if (campaigns.length === 0 || partners.length === 0) {
    console.log("No campaigns or partners found — nothing to seed.");
    return;
  }

  // ── Extra PartnerCommission rows for existing campaigns ──────────────────
  const existingCommissions = await prisma.partnerCommission.count();
  if (existingCommissions === 0) {
    const statuses = ["paid", "approved", "pending"] as const;
    let created = 0;
    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i];
      // Skip a couple of campaigns to keep the data realistically uneven
      // (not every campaign has referrals yet).
      if (i % 4 === 3) continue;
      const rows = 1 + (i % 4); // 1-4 commissions per campaign
      for (let j = 0; j < rows; j++) {
        const partner = partners[(i + j) % partners.length];
        const company = companies[(i + j) % companies.length];
        const base = campaign.commission_type === "percentage" ? 45 + j * 30 : campaign.commission_value;
        await prisma.partnerCommission.create({
          data: {
            partner_id: partner.id,
            campaign_id: campaign.id,
            amount: Math.round(base * 100) / 100,
            status: statuses[(i + j) % statuses.length],
            company_name: company?.name ?? null,
            project_name: null,
          },
        });
        created++;
      }
    }
    console.log(`Created ${created} partner_commissions across ${campaigns.length} campaigns.`);
  } else {
    console.log(`partner_commissions already has ${existingCommissions} rows — skipping.`);
  }

  // ── Real Coupon catalog ────────────────────────────────────────────────
  const existingCoupons = await prisma.coupon.count();
  if (existingCoupons === 0) {
    const referralPartner = partners[0];
    const seedCoupons = [
      {
        code: "BEMVINDO10",
        coupon_type: "discount",
        discount_type: "percentage",
        discount_value: 10,
        usage_limit: 500,
        usage_limit_per_company: "once",
        valid_from: new Date("2026-01-01"),
        valid_until: new Date("2026-12-31"),
        applicable_products: JSON.stringify(["Todos os produtos"]),
        status: "active",
      },
      {
        code: "AGENCIA20",
        coupon_type: "discount",
        discount_type: "percentage",
        discount_value: 20,
        usage_limit: 200,
        usage_limit_per_company: "custom",
        max_uses_per_company: 3,
        valid_from: new Date("2026-02-01"),
        valid_until: new Date("2026-08-31"),
        applicable_products: JSON.stringify(["Design e Criação", "Performance"]),
        allowed_account_types: JSON.stringify(["agencias"]),
        status: "active",
      },
      {
        code: "BONUS500",
        coupon_type: "credit-bonus",
        credit_bonus: 500,
        usage_limit: 100,
        usage_limit_per_company: "once",
        valid_from: new Date("2026-03-01"),
        valid_until: new Date("2026-06-30"),
        applicable_products: JSON.stringify(["Todos os produtos"]),
        status: "active",
      },
      {
        code: "CARLOS10",
        coupon_type: "referral",
        discount_type: "percentage",
        discount_value: 10,
        usage_limit: 0,
        usage_limit_per_company: "unlimited",
        valid_from: new Date("2026-01-01"),
        valid_until: new Date("2027-01-01"),
        applicable_products: JSON.stringify(["Todos os produtos"]),
        linked_user_id: referralPartner?.user_id,
        linked_user_commission_type: "percentage",
        linked_user_commission_value: 8,
        status: "active",
      },
      {
        code: "PROMOVERAO",
        coupon_type: "discount",
        discount_type: "fixed",
        discount_value: 150,
        usage_limit: 80,
        usage_limit_per_company: "once",
        valid_from: new Date("2025-11-01"),
        valid_until: new Date("2026-02-28"),
        applicable_products: JSON.stringify(["Estratégia"]),
        status: "expired",
      },
    ];

    const created: { id: string; usageLimit: number }[] = [];
    for (const data of seedCoupons) {
      const c = await prisma.coupon.create({ data: data as any });
      created.push({ id: c.id, usageLimit: data.usage_limit ?? 0 });
    }
    console.log(`Created ${created.length} coupons.`);

    // ── Real CouponUsage rows (drives `usedCount` for real) ────────────────
    let usagesCreated = 0;
    for (const c of created) {
      const useCount = Math.min(companies.length, Math.max(2, Math.floor(Math.random() * 6)));
      for (let i = 0; i < useCount; i++) {
        const company = companies[i % companies.length];
        await prisma.couponUsage.create({
          data: { coupon_id: c.id, company_id: company?.id ?? null },
        });
        usagesCreated++;
      }
    }
    console.log(`Created ${usagesCreated} coupon_usages.`);
  } else {
    console.log(`coupons already has ${existingCoupons} rows — skipping.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
