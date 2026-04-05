import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Initial staff members — always present in the system.
 * These are merged with any staff added via the admin panel.
 */
const INITIAL_STAFF = [
  { name: "Rodolfo Dayot Luga II", email: "rluga@ececontactcenters.com", role: "Programmer" },
  { name: "John Mark Bigtas Trias", email: "jtrias@ececontactcenters.com", role: "Programmer" },
  { name: "Lemuel De Leon Ching", email: "lching@ececontactcenters.com", role: "Admin" },
  { name: "Gianne Carlo Fernandez Mangampat", email: "gmangampat@ececonsultinggroup.net", role: "Programmer" },
  { name: "Regie Delvo Gajelomo", email: "rgajelomo@ececonsultinggroup.com", role: "Programmer" },
  { name: "Jomari Urfe Garces", email: "jomari.garces@ececontactcenters.com", role: "Admin" },
  { name: "Main Admin", email: "wmt@ececontactcenters.com", role: "Admin" },
];

export const getStaff = query({
  handler: async (ctx) => {
    const savedStaff = await ctx.db.query("staff").collect();

    // Merge: initial staff are always present, saved staff can override
    const staffMap = {};
    INITIAL_STAFF.forEach((s) => {
      staffMap[s.email.toLowerCase()] = { ...s, _id: undefined };
    });
    savedStaff.forEach((s) => {
      staffMap[s.email.toLowerCase()] = s;
    });

    return Object.values(staffMap);
  },
});

export const addStaff = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("staff", {
      name: args.name,
      email: args.email,
      role: args.role,
    });
  },
});

export const updateStaffRole = mutation({
  args: {
    staffEmail: v.string(),
    newRole: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("staff")
      .withIndex("by_email", (q) => q.eq("email", args.staffEmail))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { role: args.newRole });
    } else {
      // Staff member not in DB yet (initial staff) — add them
      const initial = INITIAL_STAFF.find(
        (s) => s.email.toLowerCase() === args.staffEmail.toLowerCase()
      );
      if (initial) {
        await ctx.db.insert("staff", {
          name: initial.name,
          email: initial.email,
          role: args.newRole,
        });
      }
    }
  },
});
