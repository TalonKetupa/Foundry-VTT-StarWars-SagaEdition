import {SWSEActor} from "./actor.js";
import {resolveValueArray} from "../util.js";


function reduceSpeedForArmorType(speed, armorType) {
    if ("Light" === armorType) {
        return speed;
    }
    return speed.replace("4", "3").replace("6", "4");
}

/**
 *
 * @param {SWSEActor} actor
 * @param {SWSEItem} armor
 * @returns {{fortDefense: (*|number), notes: (*|string), refDefense: (*|number), name, type: string, maxDex: (*|number), speed}}
 */
function generateArmorBlock(actor, armor) {
    let attributes = armor.data.data.attributes;
    let speed = actor.speed


    return {
        name: armor.name,
        speed: speed,
        refDefense: armor.reflexDefenseBonus ? armor.reflexDefenseBonus : 0,
        fortDefense: armor.fortitudeDefenseBonus ? armor.fortitudeDefenseBonus : 0,
        maxDex: armor.maximumDexterityBonus ? armor.maximumDexterityBonus : 0,
        notes: attributes.special && Array.isArray(attributes.special.value) ? attributes.special.value.join(", ") : "",
        type: armor.armorType
    };
}

/**
 *
 * @param actor {SWSEActor}
 * @returns
 */
export function resolveDefenses(actor) {
    let defenseBonuses = actor.getTraitAttributesByKey('defenseBonuses');
    let conditionBonus = actor.conditionBonus;
    let fort = _resolveFort(actor, defenseBonuses, conditionBonus);
    let will = _resolveWill(actor, defenseBonuses, conditionBonus);
    let ref = _resolveRef(actor, defenseBonuses, conditionBonus);
    let dt = _resolveDt(actor, defenseBonuses, conditionBonus);
    let situationalBonuses = _getSituationalBonuses(defenseBonuses);

    let damageReduction = actor.getInheritableAttributesByKey("damageReduction", "SUM", null)


    let armors = []

    for (const armor of actor.getEquippedItems().filter(item => item.type === 'armor')) {
        armors.push(generateArmorBlock(actor, armor));
    }

    return {defense: {fort, will, ref, dt, damageThreshold: dt, damageReduction, situationalBonuses}, armors};
}

/**
 *
 * @param actor {SWSEActor}
 * @param defenseBonuses {[]}
 * @param conditionBonus {number}
 * @returns {number}
 * @private
 */
function _resolveFort(actor, defenseBonuses, conditionBonus) {
    let total = [];
    total.push(10);
    let heroicLevel = actor.getHeroicLevel();
    total.push(heroicLevel);
    let abilityBonus = _getFortStatMod(actor);
    total.push(abilityBonus);
    let traitBonus = _getTraitDefBonus('fortitude', defenseBonuses);
    total.push(traitBonus);
    let classBonus = actor.getInheritableAttributesByKey("classFortitudeDefenseBonus", "MAX", undefined);
    total.push(classBonus);
    let equipmentBonus = actor.getInheritableAttributesByKey("fortitudeDefenseBonus", "SUM", undefined);
    total.push(equipmentBonus);
    total.push(conditionBonus);
    let armorBonus = resolveValueArray([equipmentBonus, heroicLevel]);
    let miscBonuses = [];
    miscBonuses.push(conditionBonus)
    miscBonuses.push(traitBonus)
    let miscBonus = resolveValueArray(miscBonuses)
    return {total: resolveValueArray(total, actor), abilityBonus, armorBonus, classBonus, miscBonus}
}

function _resolveWill(actor, defenseBonuses, conditionBonus) {
    let actorData = actor.data
    let total = [];
    total.push(10);
    let heroicLevel = actor.getHeroicLevel();
    total.push(heroicLevel);
    total.push(actor.characterLevel);
    let abilityBonus = _getWisMod(actorData);
    total.push(abilityBonus);
    let classBonus = actor.getInheritableAttributesByKey("classWillDefenseBonus").map(attr => attr.value).reduce((a, b)=> Math.max(a,b), 0);
    total.push(classBonus);
    let traitBonus = _getTraitDefBonus('will', defenseBonuses);
    total.push(traitBonus);
    total.push(conditionBonus);
    let miscBonus = resolveValueArray([traitBonus, conditionBonus])
    let armorBonus = resolveValueArray([heroicLevel]);
    return {total: resolveValueArray(total, actor), abilityBonus, armorBonus, classBonus, miscBonus}
}

function _resolveRef(actor, defenseBonuses, conditionBonus) {
    let actorData = actor.data
    let total = [];
    total.push(10);
    let armorBonus = _selectRefBonus(actor.getHeroicLevel(), _getEquipmentRefBonus(actor));
    total.push(armorBonus);
    let abilityBonus = _selectDexMod(_getDexMod(actorData), _getEquipmentMaxDexBonus(actor));
    total.push(abilityBonus);
    let traitBonus = _getTraitDefBonus('reflex', defenseBonuses);
    total.push(traitBonus);
    let classBonus = actor.getInheritableAttributesByKey("classReflexDefenseBonus").map(attr => attr.value).reduce((a, b)=> Math.max(a,b), 0);

    let dodgeBonus = actor.getInheritableAttributesByKey("bonusDodgeReflexDefense")
        .map(attr => parseInt(`${attr.value}`)).reduce((a, b) => a + b, 0)
    total.push(classBonus);
    total.push(_getTraitRefMod(actor));
    total.push(conditionBonus);
    total.push(dodgeBonus);
    let miscBonus = resolveValueArray([traitBonus, conditionBonus, dodgeBonus])
    return {total: resolveValueArray(total, actor), abilityBonus, armorBonus, classBonus, miscBonus}
}

function _getDamageThresholdSizeMod(actor) {
    let attributes = actor.getTraitAttributesByKey('damageThresholdSizeModifier')

    let total = [];
    for (let attribute of attributes) {
        total.push(attribute)
    }

    return resolveValueArray(total, actor)
}

function _resolveDt(actor, defenseBonuses, conditionBonus) {
    let total = [];
    total.push(_resolveFort(actor, defenseBonuses, conditionBonus).total);
    total.push(_getDamageThresholdSizeMod(actor))
    return {total: resolveValueArray(total, actor)}
}

function capFirst(word) {
    return word.charAt(0).toUpperCase() + word.slice(1)
}

function _getSituationalBonuses(defenseBonuses) {
    let situational = []
    for (let defenseBonus of defenseBonuses) {
        if (defenseBonus.value.modifier) {
            situational.push(`${(defenseBonus.value.bonus > -1 ? "+" : "") + defenseBonus.value.bonus} ${defenseBonus.value.bonus < 0 ? "penalty" : "bonus"} to their ${capFirst(defenseBonus.value.defense)} Defense to resist ${defenseBonus.value.modifier}`);
        }
    }
    return situational;
}

function _selectRefBonus(heroicLevel, armorBonus) {
    if (armorBonus > -1) {
        return armorBonus;
    }
    return heroicLevel;
}

function _selectDexMod(dexterityModifier, maxDexterityBonus) {
    return Math.min(dexterityModifier, maxDexterityBonus);
}

function _getDexMod(actorData) {
    return actorData.data.attributes.dex.mod;
}

function _getWisMod(actorData) {
    return actorData.data.attributes.wis.mod;
}

function _getFortStatMod(actor) {
    let attributes = actor.data.data.attributes;
    return actor.ignoreCon() ? attributes.str.mod : attributes.con.mod;
}

function _getClassDefBonus(stat, actor) {
    let bonus = 0;
    for (let charclass of actor.classes || []) {
        bonus = Math.max(bonus, charclass.data.data.defense[stat]);
    }
    return bonus;
}

/**
 *
 * @param defenseType {string}
 * @param defenseBonuses {[]}
 * @returns {number}
 * @private
 */
function _getTraitDefBonus(defenseType, defenseBonuses) {
    let bonus = 0;
    for (let defenseBonus of defenseBonuses) {
        if (!defenseBonus.value.modifier && (defenseBonus.value.defense === 'all' || defenseBonus.value.defense === defenseType)) {
            bonus = bonus + defenseBonus.value.bonus;
        }
    }
    return bonus;
}

function _getTraitRefMod(actor) {
    let sizeBonuses = actor.getTraitAttributesByKey('sizeModifier');
    let total = 0;
    for (let sizeBonus of sizeBonuses) {
        total = total + sizeBonus;
    }
    return total;
}

/**
 *
 * @param actor {SWSEActor}
 * @returns {number}
 * @private
 */
function _getEquipmentFortBonus(actor) {
    let equipped = actor.getEquippedItems();
    let bonus = 0;
    for (let item of equipped) {
        if (item.fortitudeDefenseBonus) {
            bonus = Math.max(bonus, item.fortitudeDefenseBonus);
        }
    }
    return bonus;
}

function _getEquipmentRefBonus(actor) {
    let equipped = actor.getEquippedItems();
    let bonus = -1;
    for (let item of equipped) {
        if (item.reflexDefenseBonus) {
            bonus = Math.max(bonus, item.reflexDefenseBonus);
        }
    }
    return bonus;
}

function _getEquipmentMaxDexBonus(actor) {
    let equipped = actor.getEquippedItems();
    let bonus = 1000;
    for (let item of equipped) {
        if (!isNaN(item.maximumDexterityBonus)) {
            bonus = Math.min(bonus, item.maximumDexterityBonus);
        }
    }
    return bonus;
}
