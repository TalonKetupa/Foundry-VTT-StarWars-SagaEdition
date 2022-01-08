import {filterItemsByType, resolveValueArray} from "./util.js";

export function
/**
 *
 * @param {SWSEActor|SWSEItem} target
 * @param {Object[]} prereqs
 * @param {string} prereqs[].text always available
 * @param {string} prereqs[].type always available
 * @param {string} prereqs[].requirement available on all types except AND, OR, and NULL
 * @param {number} prereqs[].count available on OR
 * @param {Object[]} prereqs[].children available on AND and OR
 * @returns {{failureList: [], doesFail: boolean, silentFail: []}}
 */
meetsPrerequisites(target, prereqs) {
    //TODO add links to failures to upen up the fancy compendium to show the missing thing.  when you make a fancy compendium

    let failureList = [];
    let silentFail = [];
    let successList = [];
    if (!prereqs) {
        return {doesFail: false, failureList, silentFail: silentFail, successList};
    }

    if (!Array.isArray(prereqs)) {
        prereqs = [prereqs];
    }

    for (let prereq of prereqs) {
        switch (prereq.type) {
            case undefined:
                continue;
            case 'AGE':
                let age = target.age;
                if (parseInt(prereq.low) > age || (prereq.high && parseInt(prereq.high) < age)) {
                    failureList.push({fail: true, message: `${prereq.type}: ${prereq.text}`});
                    continue;
                }
                successList.push({prereq, count: 1});
                continue;
            case 'CHARACTER LEVEL':
                if (!(target.characterLevel < parseInt(prereq.requirement))) {
                    successList.push({prereq, count: 1});
                    continue;
                }
                break;
            case 'BASE ATTACK BONUS':
                if (!(target.baseAttackBonus < parseInt(prereq.requirement))) {
                    successList.push({prereq, count: 1});
                    continue;
                }
                break;
            case 'DARK SIDE SCORE':
                if (!target.darkSideScore < resolveValueArray([prereq.requirement], target)) {
                    successList.push({prereq, count: 1});
                    continue;
                }
                break;
            case 'ITEM':
                let ownedItem = target.getInventoryItems();
                let filteredItem = ownedItem.filter(feat => feat.data.finalName === prereq.requirement);
                if (filteredItem.length > 0) {
                    successList.push({prereq, count: 1});
                    continue;
                }
                break;
            case 'SPECIES':
                let filteredSpecies = target.species.filter(feat => feat.data.finalName === prereq.requirement);
                if (filteredSpecies.length > 0) {
                    successList.push({prereq, count: 1});
                    continue;
                }
                break;
            case 'TRAINED SKILL':
                if (target.data.prerequisites.trainedSkills.filter(trainedSkill => trainedSkill.toLowerCase() === prereq.requirement.toLowerCase()).length === 1) {
                    successList.push({prereq, count: 1});
                    continue;
                }
                break;
            case 'FEAT':
                let ownedFeats = filterItemsByType(target.items.values(), "feat");
                let filteredFeats = ownedFeats.filter(feat => feat.data.finalName === prereq.requirement);
                if (filteredFeats.length > 0) {
                    if (!meetsPrerequisites(target, filteredFeats[0].data.data.prerequisite).doesFail) {
                        successList.push({prereq, count: 1});
                        continue;
                    }
                }
                break;
            case 'CLASS':
                let ownedClasses = filterItemsByType(target.items.values(), "class");
                let filteredClasses = ownedClasses.filter(feat => feat.data.finalName === prereq.requirement);
                if (filteredClasses.length > 0) {
                    if (!meetsPrerequisites(target, filteredClasses[0].data.data.prerequisite).doesFail) {
                        successList.push({prereq, count: 1});
                        continue;
                    }
                }
                break;
            case 'TRAIT':
                let ownedTraits = filterItemsByType(target.items.values(), "trait");
                let filteredTraits = ownedTraits.filter(feat => feat.data.finalName === prereq.requirement);
                if (filteredTraits.length > 0) {
                    let parentsMeetPrequisites = false;
                    for (let filteredTrait of filteredTraits) {
                        if (!meetsPrerequisites(target, filteredTrait.data.data.prerequisite).doesFail) {
                            successList.push({prereq, count: 1});
                            parentsMeetPrequisites = true;
                        }
                    }
                    if (parentsMeetPrequisites) {
                        continue;
                    }
                }
                break;
            case 'PROFICIENCY':
                if (target.data.proficiency.weapon.includes(prereq.requirement.toLowerCase())
                    || target.data.proficiency.armor.includes(prereq.requirement.toLowerCase())) {
                    successList.push({prereq, count: 1});
                    continue;
                }
                break;
            case 'TALENT':
                let ownedTalents = filterItemsByType(target.items.values(), "talent");
                let filteredTalents = ownedTalents.filter(feat => feat.data.finalName === prereq.requirement);
                if (filteredTalents.length > 0) {
                    if (!meetsPrerequisites(target, filteredTalents[0].data.data.prerequisite).doesFail) {
                        successList.push({prereq, count: 1});
                        continue;
                    }
                }

                let talentsByTreeFilter = ownedTalents.filter(talent => talent.data.data.talentTree === prereq.requirement || talent.data.data.bonusTalentTree === prereq.requirement);
                if (talentsByTreeFilter.length > 0) {
                    let count = 0;
                    for (let talent of talentsByTreeFilter) {
                        if (!meetsPrerequisites(target, talent.data.data.prerequisite).doesFail) {
                            count++;
                        }
                    }
                    if (count > 0) {
                        successList.push({prereq, count})
                        continue;
                    }
                }

                break;
            case 'TRADITION':
                let ownedTraditions = filterItemsByType(target.items.values(), "forceTradition");
                let filteredTraditions = ownedTraditions.filter(feat => feat.data.finalName === prereq.requirement);
                if (filteredTraditions.length > 0) {
                    if (!meetsPrerequisites(target, filteredTraditions[0].data.data.prerequisite).doesFail) {
                        successList.push({prereq, count: 1});
                        continue;
                    }
                }
                break;
            case 'FORCE TECHNIQUE':
                let ownedForceTechniques = filterItemsByType(target.items.values(), "forceTechnique");
                if (!isNaN(prereq.requirement)) {
                    if (!(ownedForceTechniques.length < parseInt(prereq.requirement))) {
                        successList.push({prereq, count: 1});
                        continue;
                    }
                }

                let filteredForceTechniques = ownedForceTechniques.filter(feat => feat.data.finalName === prereq.requirement);
                if (filteredForceTechniques.length > 0) {
                    if (!meetsPrerequisites(target, filteredForceTechniques[0].data.data.prerequisite).doesFail) {
                        successList.push({prereq, count: 1});
                        continue;
                    }
                }
                break;
            case 'ATTRIBUTE':
                let toks = prereq.requirement.split(" ");
                if (!(target.getInheritableAttributesByKey(toks[0]) < parseInt(toks[1]))) {
                    successList.push({prereq, count: 1});
                    continue;
                }
                break;
            case 'AND': {
                let meetsChildPrereqs = meetsPrerequisites(target, prereq.children);
                if (!(meetsChildPrereqs.doesFail)) {
                    successList.push({prereq, count: 1});
                    continue;
                }
                if(meetsChildPrereqs.failureList.length > 1) {
                    failureList.push({fail: true, message: `all of:`, children: meetsChildPrereqs.failureList})
                } else {
                    failureList.push(...meetsChildPrereqs.failureList)
                }
                continue;
            }
            case 'OR': {
                let meetsChildPrereqs = meetsPrerequisites(target, prereq.children)
                let count = 0;
                for (let success of meetsChildPrereqs.successList) {
                    count += success.count;
                }

                if (!(count < prereq.count)) {
                    successList.push({prereq, count: 1});
                    continue;
                }
                if(meetsChildPrereqs.failureList.length > 1) {
                    failureList.push({fail:meetsChildPrereqs.doesFail, message: `at least of ${prereq.count}:`, children:meetsChildPrereqs.failureList})
                } else {
                    failureList.push(...meetsChildPrereqs.failureList)
                }
                continue;
            }
            case 'SPECIAL':
                if (prereq.requirement.toLowerCase() === 'not a droid') {
                    let inheritableAttributesByKey = target.getInheritableAttributesByKey("isDroid", "OR", null);
                    if (!inheritableAttributesByKey) {
                        successList.push({prereq, count: 1});
                        continue;
                    }
                    break;
                } else if (prereq.requirement.toLowerCase() === 'is a droid') {
                    if (target.getInheritableAttributesByKey("isDroid", "OR", null)) {
                        successList.push({prereq, count: 1});
                        continue;
                    }
                    break;
                } else if (prereq.requirement === 'Has Built Lightsaber') {
                    failureList.push({fail: false, message: `${prereq.type}: ${prereq.text}`});
                    continue;
                }
                console.log("this prereq is not supported", prereq)
                failureList.push({fail: true, message: `${prereq.type}: ${prereq.text}`});
                break;
            case 'GENDER':
                if (target.data.data.sex.toLowerCase() === prereq.requirement.toLowerCase()) {
                    successList.push({prereq, count: 1});
                    continue;
                }
                break;
            case 'EQUIPPED':
                let equippedItems = target.getEquippedItems();
                let filteredEquippedItems = equippedItems.filter(item => item.data.finalName === prereq.requirement);
                if (filteredEquippedItems.length > 0) {
                    successList.push({prereq, count: 1});
                    continue;
                }
                break;
            default:
                console.log("this prereq is not supported", prereq)
        }

        failureList.push({fail: true, message: `${prereq.text}`});
    }

    let doesFail = false;
    for (let fail of failureList) {
        if (fail.fail === true) {
            doesFail = true;
            break;
        }
    }
    //
    // for (let fail of silentFail) {
    //     if (fail.fail === true) {
    //         doesFail = true;
    //         break;
    //     }
    // }

    return {doesFail, failureList, silentFail, successList};
}


export function formatPrerequisites(failureList) {
    let format = "<ul>";
    for (let fail of failureList) {
        format = format + `<li>${fail.message}`;
        if(fail.children && fail.children.length>0){
            format = format + "</br>" + formatPrerequisites(fail.children);
        }
        format = format + `</li>`;
    }
    return format + "</ul>";
}