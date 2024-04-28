import SystemDataModel from "./abstract.mjs";
import CommonActorData from "./commondata.mjs";

import {AbilityFunctions} from "./templates/abilities.mjs";
import {DefenseFields, DefenseFunctions} from "./templates/defenses.mjs";
import {DetailFunctions, DetailFields} from "./templates/details.mjs";
import {HealthFunctions} from "./templates/health.mjs";
import {ShieldFunctions} from "./templates/shields.mjs";
import {SkillFunctions, SkillFields} from "./templates/skills.mjs";
import {TraitsFields, TraitsFunctions} from "./templates/traits.mjs";

const fields = foundry.data.fields;
const npcFunctionClasses = [
    AbilityFunctions,
    DefenseFunctions,
    DetailFunctions,
    HealthFunctions,
    ShieldFunctions,
    SkillFunctions,
    TraitsFunctions,
];

export class NpcDataModel extends SystemDataModel.mixin(...npcFunctionClasses) {
    static _systemType = "npc";

    static defineSchema() {
        return {
            ...CommonActorData.commonData,
            defense: new fields.SchemaField({
                ...DefenseFields.npc,
            }),
            skills: new fields.SchemaField({
                ...SkillFields.npc,
            }),
            details: new fields.SchemaField({
                ...DetailFields.npc,
            }),
            ...TraitsFields.npc,
            settings: new fields.SchemaField({
                isNPC: new fields.SchemaField({
                    value: new fields.BooleanField({
                        initial: false,
                        label: "Is NPC",
                    }),
                }),
                ignorePrerequisites: new fields.SchemaField({
                    value: new fields.BooleanField({
                        initial: false,
                        label: "Ignore Prerequisites",
                    }),
                }),
            }),
            attacks: new fields.ArrayField({}),
        };
    }

    /**
     * @override
     */
    prepareBaseData() {
        this.settings.isNPC.value = true;
        this.settings.ignorePrerequisites.value = true;
    }

    /**
     * @override
     * This is the final place to manipulate a document's data in a way that is generally
     * accessible within the foundry API. Derived data is the place to calculate modifiers,
     * encumbrance, and all of the other pieces of information you want available.
     *
     * If you have a system data model, you can run type-specific logic here. Keep in mind
     * that you're operating within the system object, so you'll need to call this.parent to
     * access the actual document properties, e.g. this.parent.items to access the items
     * collection.
     */
    prepareDerivedData() {}
}
