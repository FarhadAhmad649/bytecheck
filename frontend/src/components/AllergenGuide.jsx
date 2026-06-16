import React from "react";
import { useNavigate } from "react-router-dom";


// ─── Your Real Allergen Data ───
export const ALLERGEN_DATA = [
  {
    id: "milk",
    name: "Milk",
    emoji: "🥛",
    description: "Dairy-based allergen",
    details:
      "Milk allergy is one of the most common food allergies. Found in dairy products, butter, cheese, cream, and many processed foods.",
    hiddenNames: [
      "Casein",
      "Whey",
      "Lactalbumin",
      "Lactoglobulin",
      "Lactulose",
      "Caseinate",
    ],
    cautions: [
      "Always check 'may contain milk' warnings on packaging",
      "Non-dairy products can still contain casein",
      "Some medications use lactose as a filler",
      "Watch out for milk in deli meats and hot dogs",
    ],
  },
  {
    id: "eggs",
    name: "Eggs",
    emoji: "🥚",
    description: "Common in baked goods",
    details:
      "Egg allergy is especially common in children. Found in baked goods, pasta, mayonnaise, and sauces.",
    hiddenNames: [
      "Albumin",
      "Globulin",
      "Lysozyme",
      "Ovalbumin",
      "Ovomucin",
      "Silici albuminate",
    ],
    cautions: [
      "Egg wash is used on pastries and breads",
      "Some wines are clarified using egg whites",
      "Vaccines like flu shots may contain egg proteins",
      "Egg substitutes in baking may still trigger reactions",
    ],
  },
  {
    id: "gluten",
    name: "Gluten",
    emoji: "🌾",
    description: "Wheat, barley & rye protein",
    details:
      "Gluten is a protein found in wheat, barley, and rye. Found in bread, pasta, cereals, beer, and many sauces.",
    hiddenNames: ["Semolina", "Spelt", "Kamut", "Farro", "Durum", "Triticale"],
    cautions: [
      "Oats are often cross-contaminated with wheat",
      "Soy sauce almost always contains wheat",
      "Gluten hides in soups, gravies, and sauces",
      "Look for certified gluten-free labels, not just 'wheat-free'",
    ],
  },
  {
    id: "nuts",
    name: "Tree Nuts",
    emoji: "🌰",
    description: "Almonds, cashews & more",
    details:
      "Tree nut allergy includes almonds, cashews, walnuts, and more. Found in desserts, cereals, sauces, and oils.",
    hiddenNames: [
      "Praline",
      "Marzipan",
      "Nougat",
      "Gianduja",
      "Mandelonas",
      "Nut paste",
    ],
    cautions: [
      "Shared equipment in factories causes cross-contact",
      "Natural flavoring can sometimes mean nut extract",
      "Some ethnic cuisines heavily use tree nuts",
      "Nut oils can still cause reactions in sensitive individuals",
    ],
  },
  {
    id: "peanuts",
    name: "Peanuts",
    emoji: "🥜",
    description: "Can be life-threatening",
    details:
      "Peanut allergy can be severe and life-threatening. Found in peanut butter, snacks, sauces, and Asian cuisine.",
    hiddenNames: [
      "Groundnuts",
      "Beer nuts",
      "Mixed nuts",
      "Monkey nuts",
      "Arachis oil",
      "Mandelonas",
    ],
    cautions: [
      "Always carry an epinephrine auto-injector if prescribed",
      "African and Asian cuisine frequently use peanut oil",
      "Some pet foods contain peanuts — wash hands after handling",
      "Peanut flour is used in some gluten-free products",
    ],
  },
  {
    id: "fish",
    name: "Fish",
    emoji: "🐟",
    description: "Common adult food allergy",
    details:
      "Fish allergy is among the most common adult food allergies. Found in sauces, dressings, and Caesar salad.",
    hiddenNames: [
      "Anchovies",
      "Worcestershire",
      "Surimi",
      "Imitation crab",
      "Fish sauce",
      "Bouillabaisse",
    ],
    cautions: [
      "Caesar salad dressing typically contains anchovies",
      "Some Worcestershire sauces contain fish",
      "Imitation crab is made from fish (surimi)",
      "Cross-contamination is high in seafood restaurants",
    ],
  },
  {
    id: "soybeans",
    name: "Soybeans",
    emoji: "🫘",
    description: "Common in processed foods",
    details:
      "Soy allergy is common in infants and young children. Found in tofu, miso, soy sauce, and many processed foods.",
    hiddenNames: [
      "Edamame",
      "Tempeh",
      "Miso",
      "Tamari",
      "TVP",
      "Textured vegetable protein",
    ],
    cautions: [
      "Soy is in most processed and packaged foods",
      "Some infant formulas are soy-based",
      "Vegetarian/vegan products heavily rely on soy",
      "Soybean oil may still trigger reactions in sensitive individuals",
    ],
  },
  {
    id: "crustaceans",
    name: "Crustaceans",
    emoji: "🦐",
    description: "Shrimp, crab & lobster",
    details:
      "Crustacean allergy includes shrimp, lobster, crab, and prawns. Found in seafood dishes, stocks, and some sauces.",
    hiddenNames: [
      "Prawns",
      "Crawfish",
      "Crayfish",
      "Krill",
      "Barnacles",
      "Shrimp paste",
    ],
    cautions: [
      "Shrimp paste is common in Southeast Asian cooking",
      "Glucosamine supplements are often derived from shellfish",
      "Cross-contact is very common in seafood restaurants",
      "Stock and bouillon cubes may contain shellfish extract",
    ],
  },
  {
    id: "molluscs",
    name: "Molluscs",
    emoji: "🦑",
    description: "Squid, oysters & clams",
    details:
      "Mollusc allergy includes squid, oysters, mussels, and clams. Found in seafood platters, paella, and Asian cuisine.",
    hiddenNames: [
      "Abalone",
      "Escargot",
      "Oyster sauce",
      "Clam juice",
      "Squid ink",
      "Periwinkle",
    ],
    cautions: [
      "Oyster sauce is widely used in Chinese cooking",
      "Clam chowder and bisques are common in restaurants",
      "Squid ink pasta is a hidden source",
      "Worcestershire sauce may contain anchovies and molluscs",
    ],
  },
  {
    id: "sesame",
    name: "Sesame",
    emoji: "🫙",
    description: "Growing in prevalence",
    details:
      "Sesame allergy is growing in prevalence. Found in tahini, hummus, bread, and Asian cuisine.",
    hiddenNames: [
      "Tahini",
      "Til",
      "Gingelly",
      "Benne",
      "Sesame flour",
      "Sesame oil",
    ],
    cautions: [
      "Sesame oil is used in many Asian dishes for flavor",
      "Burger buns and bread rolls often have sesame seeds",
      "Hummus always contains tahini (sesame paste)",
      "Some cosmetics and medications contain sesame oil",
    ],
  },
  {
    id: "mustard",
    name: "Mustard",
    emoji: "🌿",
    description: "Found in condiments",
    details:
      "Mustard allergy can cause severe reactions. Found in condiments, sauces, marinades, and spice mixes.",
    hiddenNames: [
      "Mustard seed",
      "Mustard oil",
      "Mustard flour",
      "Mustard leaves",
      "Sinapis",
      "Brassica",
    ],
    cautions: [
      "Curry powder and spice blends often contain mustard",
      "Salad dressings and vinaigrettes frequently use mustard",
      "Mustard is used as an emulsifier in processed meats",
      "Indian and South Asian foods use mustard oil heavily",
    ],
  },
  {
    id: "celery",
    name: "Celery",
    emoji: "🥬",
    description: "Includes seeds & celeriac",
    details:
      "Celery allergy includes all parts of the plant including seeds. Found in soups, salads, and spice mixes.",
    hiddenNames: [
      "Celeriac",
      "Celery salt",
      "Celery seed",
      "Celery oil",
      "Smallage",
      "Lovage",
    ],
    cautions: [
      "Celery salt is in many spice blends and Bloody Mary mix",
      "Stock cubes and bouillons almost always contain celery",
      "Celeriac looks different but causes the same reaction",
      "Some herbal teas contain celery seed",
    ],
  },
  {
    id: "sulphites",
    name: "Sulphites",
    emoji: "🍷",
    description: "Found in wine & dried fruits",
    details:
      "Sulphite sensitivity can cause asthma-like symptoms. Found in wine, dried fruits, pickled foods, and some medications.",
    hiddenNames: [
      "Sulfur dioxide",
      "Sodium bisulfite",
      "Potassium metabisulfite",
      "E220",
      "E221",
      "E228",
    ],
    cautions: [
      "Most wines contain sulphites as a preservative",
      "Dried fruits like apricots are very high in sulphites",
      "Some medications use sulphites as preservatives",
      "Restaurant salads may be treated to stay fresh longer",
    ],
  },
];

export const getThemeForAllergen = (id, isDark) => {
  const themes = {
    milk: {
      bg: "bg-blue-500/10",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-500/30",
    },
    eggs: {
      bg: "bg-yellow-500/10",
      text: "text-yellow-600 dark:text-yellow-500",
      border: "border-yellow-200 dark:border-yellow-500/30",
    },
    gluten: {
      bg: "bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-500",
      border: "border-amber-200 dark:border-amber-500/30",
    },
    nuts: {
      bg: "bg-orange-500/10",
      text: "text-orange-600 dark:text-orange-400",
      border: "border-orange-200 dark:border-orange-500/30",
    },
    peanuts: {
      bg: "bg-red-500/10",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-200 dark:border-red-500/30",
    },
    fish: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-200 dark:border-cyan-500/30",
    },
    soybeans: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-500/30",
    },
    crustaceans: {
      bg: "bg-rose-500/10",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-500/30",
    },
    molluscs: {
      bg: "bg-purple-500/10",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-500/30",
    },
    sesame: {
      bg: "bg-stone-500/10",
      text: "text-stone-600 dark:text-stone-400",
      border: "border-stone-200 dark:border-stone-500/30",
    },
    mustard: {
      bg: "bg-yellow-500/10",
      text: "text-yellow-600 dark:text-yellow-400",
      border: "border-yellow-200 dark:border-yellow-500/30",
    },
    celery: {
      bg: "bg-green-500/10",
      text: "text-green-600 dark:text-green-400",
      border: "border-green-200 dark:border-green-500/30",
    },
    sulphites: {
      bg: "bg-pink-500/10",
      text: "text-pink-600 dark:text-pink-400",
      border: "border-pink-200 dark:border-pink-500/30",
    },
  };
  return themes[id] || themes.milk;
};

const AllergenGuide = ({ theme, isDark }) => {
  const navigate = useNavigate();

  return (
    <div className="mt-10 pl-6 pb-6">
      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-5 pr-6">
        <h3
          className={`${theme.textMain} font-extrabold text-lg tracking-tight transition-colors`}
        >
          Allergen Guide
        </h3>
        <button
          onClick={() => navigate("/guide")}
          className="text-emerald-500 text-xs font-bold hover:text-emerald-600 transition-colors"
        >
          See All
        </button>
      </div>

      {/* ── Horizontal Slider (Carousel) ── */}
      <div
        className="flex gap-4 overflow-x-auto pb-4 pr-6 snap-x snap-mandatory hide-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {ALLERGEN_DATA.slice(0, 6).map((allergen) => {
          const colors = getThemeForAllergen(allergen.id, isDark);
          return (
            <div
              key={allergen.id}
              className={`snap-start shrink-0 w-[42%] min-w-[145px] max-w-[170px] p-4 rounded-3xl border flex flex-col justify-between transition-all ${theme.card}`}
            >
              <div>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl mb-4 ${colors.bg}`}
                >
                  {allergen.emoji}
                </div>
                <h4
                  className={`font-extrabold text-sm truncate ${colors.text}`}
                >
                  {allergen.name}
                </h4>
                <p
                  className={`text-[10px] font-bold mt-1.5 leading-relaxed line-clamp-3 ${theme.textSub}`}
                >
                  {allergen.description}
                </p>
              </div>

              {/* 🔴 NEW: This passes the specific allergen ID to the Guide page */}
              <button
                onClick={() =>
                  navigate("/guide", { state: { expandId: allergen.id } })
                }
                className={`mt-4 w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors active:scale-95 ${
                  isDark
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Learn More
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AllergenGuide;
