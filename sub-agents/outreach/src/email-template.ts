/**
 * Email Template Generator
 * 
 * Creates personalized outreach emails based on your template.
 */

export interface EmailContext {
  businessName: string;
  contactName?: string;
  competitor: string;
  niche: string;
  senderName: string;
}

export function generateOutreachEmail(ctx: EmailContext): { subject: string; body: string } {
  const contactGreeting = ctx.contactName 
    ? `Hi ${ctx.contactName},`
    : `Hi there,`;

  const subject = `Quick question about ${ctx.businessName}`;

  const body = `${contactGreeting}

Wasn't quite sure if I should reach out to you or someone else at ${ctx.businessName}, but I was asking ChatGPT about who is the most reputable to handle my ${ctx.niche} needs and ${ctx.competitor} showed up — not you.

Would it make sense to send over some details on how you can be recommended by AI?

Best,
${ctx.senderName}`;

  return { subject, body };
}

// Alternative templates for A/B testing
export function generateCuriousEmail(ctx: EmailContext): { subject: string; body: string } {
  const subject = `AI recommendations and ${ctx.businessName}`;

  const body = `Hey,

Did a quick experiment — asked ChatGPT who they'd recommend for ${ctx.niche} in your area.

${ctx.competitor} came up. ${ctx.businessName} didn't.

Thought you might want to know. We help businesses show up in AI search results.

Interested in learning how?

${ctx.senderName}`;

  return { subject, body };
}

export function generateDirectEmail(ctx: EmailContext): { subject: string; body: string } {
  const subject = `${ctx.competitor} is beating you in AI search`;

  const body = `Quick heads up for ${ctx.businessName}:

When people ask AI assistants about ${ctx.niche} services, your competitors are showing up. You're not.

We fix that. Takes about 2 weeks to start ranking.

Want the details?

${ctx.senderName}`;

  return { subject, body };
}
