import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getIdeas = query({
  handler: async (ctx) => {
    return await ctx.db.query("notebook").collect();
  },
});

export const addIdea = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    pros: v.optional(v.string()),
    cons: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notebook", {
      name: args.name,
      description: args.description,
      pros: args.pros || "",
      cons: args.cons || "",
      details: args.details || "",
      date: new Date().toLocaleDateString(),
    });
  },
});

export const deleteIdea = mutation({
  args: { ideaId: v.id("notebook") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.ideaId);
  },
});

export const takeIdea = mutation({
  args: {
    ideaId: v.id("notebook"),
    takerName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ideaId, {
      taker: args.takerName,
    });
  },
});
