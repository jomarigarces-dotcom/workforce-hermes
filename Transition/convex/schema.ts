import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    status: v.string(),
    assignee: v.string(),
    description: v.optional(v.string()),
    milestones: v.array(
      v.object({
        name: v.string(),
        days: v.number(),
        completed: v.optional(v.boolean()),
        completedAt: v.optional(v.string()),
      })
    ),
    completedMilestones: v.number(),
    notes: v.array(
      v.object({
        text: v.string(),
        date: v.string(),
      })
    ),
    startDate: v.optional(v.string()),
    lastUpdated: v.number(),
  }),

  staff: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.string(),
  }).index("by_email", ["email"]),

  notebook: defineTable({
    name: v.string(),
    description: v.string(),
    pros: v.optional(v.string()),
    cons: v.optional(v.string()),
    details: v.optional(v.string()),
    date: v.string(),
    taker: v.optional(v.string()),
  }),
});
