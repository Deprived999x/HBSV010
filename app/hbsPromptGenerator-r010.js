/**
 * HBS Prompt Generator Module
 * Provides functions to generate different types of character descriptions
 */

// Helper function to get parameter value by group and name
function getVal(completedParams, taxonomy, groupNum, paramName) {
    // Find the parameter in the taxonomy
    const param = taxonomy[groupNum].parameters.find(p => p.name === paramName);
    if (!param || !completedParams[param.id]) return null;
    
    // Get the completed value
    const value = completedParams[param.id].value;
    
    // Simplified but more robust check for "None" values
    if (!value || isNoneValue(value)) {
        return null;
    }
    
    return value;
}

// Helper function to check if a value is effectively "None"
function isNoneValue(value) {
    if (!value) return true;
    
    // Convert to lowercase and trim for consistent comparison
    const normalized = value.toLowerCase().trim();
    
    // Check for common patterns more reliably
    return normalized === "none" || 
           normalized === "none (default)" ||
           normalized === "(default)" ||
           normalized.startsWith("none (") ||
           normalized.endsWith(" (default)") ||
           normalized.includes("none (default)");
}

// Helper function to get modifier values
function getModifiers(completedParams, taxonomy, groupNum, paramName) {
    const param = taxonomy[groupNum].parameters.find(p => p.name === paramName);
    if (!param || !completedParams[param.id] || !completedParams[param.id].modifiers) return [];
    
    const modifiers = [];
    const modifierEntries = Object.entries(completedParams[param.id].modifiers);
    
    modifierEntries.forEach(([modName, modIndex]) => {
        if (param.modifiers && param.modifiers[modName]) {
            const modOptions = param.modifiers[modName];
            if (modOptions && modOptions[modIndex]) {
                modifiers.push(modOptions[modIndex].name);
            }
        }
    });
    
    return modifiers;
}

// Enhanced helper function to format text with proper capitalization
function formatText(text) {
    if (!text) return null;
    
    // Remove any extra whitespace first
    text = text.trim();
    
    // Handle special case for hyphenated words
    if (text.includes('-')) {
        return text.split('-')
            .map(part => formatWord(part))
            .join('-');
    }
    
    return formatWord(text);
}

// Helper to consistently format a single word with proper capitalization
function formatWord(text) {
    if (!text) return '';
    
    // Handle edge cases like empty strings or single letters
    text = text.trim();
    if (text.length === 0) return '';
    if (text.length === 1) return text.toLowerCase();
    
    // Convert to lowercase first
    return text.charAt(0).toLowerCase() + text.slice(1).toLowerCase();
}

// Enhanced modifier combining function to ensure consistent capitalization
function combineWithModifiers(base, modifiers) {
    if (!modifiers || modifiers.length === 0) return formatWord(base);
    
    // Format all modifiers consistently
    const formattedModifiers = modifiers.map(mod => formatWord(mod));
    return `${formattedModifiers.join(', ')}, ${formatWord(base)}`;
}

// Helper function to format hair color strings
function formatHairColor(colorText) {
    if (!colorText) return null;
    
    // Handle "Color - Specific Color" format
    if (colorText.includes('-')) {
        const parts = colorText.split('-').map(part => part.trim());
        // Just use the more specific color (after the dash)
        if (parts.length >= 2 && parts[1]) {
            return formatText(parts[1]);
        }
    }
    
    return formatText(colorText);
}

// Helper function to handle Afro hair texture specifically
function formatHairTexture(texture) {
    if (!texture) return null;
    
    // Special case for Afro texture
    if (texture.toLowerCase() === 'afro') {
        return 'Afro-textured';
    }
    
    return formatText(texture);
}

// Helper function to handle proper age terminology based on gender and age
function getAgeDescriptor(age, isFemale) {
    if (!age) return isFemale ? 'woman' : 'man'; // Default to adult if no age specified
    
    const ageLower = age.toLowerCase();
    
    // Map age to gender-appropriate terms
    if (isFemale) {
        // For females
        if (ageLower.includes('child') || ageLower.includes('young')) {
            return 'girl';
        } else if (ageLower.includes('teen')) {
            return 'teenage girl';
        } else if (ageLower.includes('adult') || ageLower.includes('mature') || ageLower.includes('middle') || ageLower.includes('elderly')) {
            return 'woman';
        }
        return 'woman'; // Default female descriptor
    } else {
        // For males
        if (ageLower.includes('child') || ageLower.includes('young')) {
            return 'boy';
        } else if (ageLower.includes('teen')) {
            return 'teenage boy';
        } else if (ageLower.includes('adult') || ageLower.includes('mature') || ageLower.includes('middle') || ageLower.includes('elderly')) {
            return 'man';
        }
        return 'man'; // Default male descriptor
    }
}

// Enhanced helper function to handle proper article (a/an) usage
function getArticle(word) {
    if (!word) return 'a';
    
    // Check if word starts with a vowel SOUND (not just letter)
    // Special cases for 'u' and 'h' words that don't follow the typical rules
    if (/^[aeiou]/i.test(word)) {
        // 'u' words that start with a consonant sound despite starting with a vowel letter
        if (/^uni|^us|^uk|^eu|^ut/i.test(word)) return 'a';
        return 'an';
    } else {
        // 'h' words that are silent and need 'an' instead of 'a'
        if (/^hour|^heir|^honor|^honest/i.test(word)) return 'an';
        return 'a';
    }
}

// Helper function to properly hyphenate compound adjectives
function formatCompoundAdjective(text) {
    if (!text) return null;
    
    // List of phrases that should be hyphenated when used as adjectives
    const compoundPatterns = [
        // Body descriptors
        /\b(hip|shoulder|waist|knee|ankle|elbow|chest|thigh) length\b/g,
        
        // Face descriptors
        /\b(square|heart|oval|round|triangle|diamond) shaped\b/g,
        /\b(well|poorly|sharply|subtly|softly) defined\b/g,
        /\b(feminine|masculine) sloped\b/g,
        /\b(almond|round|wide|narrow) shaped\b/g,
        /\b(flat) profiled\b/g,
        
        // Nose descriptors
        /\b(narrow|wide) bridged\b/g,
        /\b(narrow|wide) nostriled\b/g,
        
        // Hair descriptors
        /\b(side|center|off) swept\b/g,
        /\b(high|low) volume\b/g
    ];
    
    let result = text;
    
    // Apply hyphenation patterns
    compoundPatterns.forEach(pattern => {
        result = result.replace(pattern, (match) => match.replace(/\s+/g, '-'));
    });
    
    return result;
}

// Helper function to join list items with proper grammar
function joinWithCommas(items) {
    if (!items || items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    
    const lastItem = items.pop();
    return `${items.join(', ')}, and ${lastItem}`;
}

// Helper function to join sentences with proper spacing
function joinSentences(existingText, newSentence) {
    if (!newSentence) return existingText;
    if (!existingText) return newSentence;
    
    // Ensure proper spacing between sentences
    return `${existingText} ${newSentence}`;
}

// Enhanced helper function to clean up "None" values from final description
function cleanDescription(description) {
    if (!description) return description;
    
    // Get the original for comparison - avoid logging to prevent console spam
    const original = description;
    
    // Enhanced patterns to identify and remove all variants of "None"/"Default"
    const patterns = [
        // Handle specific "None" phrasings that might appear in the description
        /\b[Nn]one\s*\([Dd]efault\)\s*\w*/g,  // "None (default) X"
        /\b[Nn]one\s*\([Dd]efault\)/g,         // "None (default)"
        /\b[Nn]one\b(?!\s*of\b)/g,             // "None" but not "None of"
        /\s*\([Dd]efault\)\s*/g,               // "(default)" anywhere

        // Remove specific sentence fragments with "None" values
        / with none\.?/gi,
        / has none\.?/gi, 
        / are none\.?/gi,
        / and none\.?/gi,
        / is none\.?/gi,

        // Fix specific phrase cleanup
        / with a none /gi,
        / and none /gi,
        / styled in none/gi,
        / with none/gi,
    ];
    
    // Apply each pattern to remove "None" values
    let cleaned = description;
    patterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, ' ');
    });
    
    // Fix fragments and grammar
    const cleanupPatterns = [
        // Handle common sentence fragments after removal
        /\s+,\s*\./g,       // ", ."
        /\s+and\s*\./g,     // "and ."
        /\s+with\s*\./g,    // "with ."
        /\s+has\s*\./g,     // "has ."
        /\s+are\s*\./g,     // "are ."
        /\s+is\s*\./g,      // "is ."
        /\.\s+\./g,         // ". ."
        /,\s*\./g,          // ",."
        /\s+,\s+(?=\.)/g,   // ", ."
        /\s+and\s+(?=\.)/g, // "and ."
        /\s+with\s+(?=\.)/g,// "with ."
        / a an /g,          // "a an" error
    ];
    
    // Apply cleanup patterns
    cleanupPatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '.');
    });
    
    // Fix trailing prepositions and conjunctions
    cleaned = cleaned.replace(/\s+(with|and|or|by|to|from|as|of)\s*\.$/g, '.');
    
    // Fix specific article errors 
    cleaned = cleaned.replace(/ a ([aeiou])/gi, ' an $1');
    
    // Remove consecutive spaces and trim
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    
    // Fix capitalization issues in common patterns
    const capitalizationFixes = [
        // Fix improper capitalization after commas or in middle of phrases
        /,\s+([A-Z])/g,         // ", Uppercase" -> ", lowercase"
        /\s+([A-Z][a-z]+)(\s+)/g, // " Uppercase " -> " lowercase "
        
        // Fix specific issues seen in the example
        /\s+([A-Z])(density|volume|part|bridge|nostrils|bun)/gi, // "Black Density" -> "black density"
    ];
    
    // Apply capitalization fixes with custom logic
    cleaned = cleaned.replace(/,\s+([A-Z])/g, (match, letter) => 
        `, ${letter.toLowerCase()}`);
    
    // Fix random capitalized words (except at start of sentence)
    cleaned = cleaned.replace(/(?<=[a-z])\s+([A-Z][a-z]+)(\s+)/g, (match, word, space) => 
        ` ${word.toLowerCase()}${space}`);
    
    // Fix capitalized feature properties
    cleaned = cleaned.replace(/\s+([A-Z])(density|volume|part|bridge|nostrils|bun)/gi, (match, letter, word) => 
        ` ${letter.toLowerCase()}${word}`);
    
    // Fix multiple consecutive commas (like "a,, snub nose")
    cleaned = cleaned.replace(/,{2,}/g, ',');
    
    // Fix spaces before commas ("a , snub" -> "a, snub")
    cleaned = cleaned.replace(/\s+,/g, ',');
    
    // Fix missing space after comma ("tapered,heart" -> "tapered, heart")
    cleaned = cleaned.replace(/,([^\s])/g, ', $1');
    
    // Fix articles with commas right after ("a, pronounced" -> "a pronounced")
    cleaned = cleaned.replace(/\b(a|an),\s+/gi, '$1 ');
    
    // Fix situations with article followed by comma then adjective ("a, pronounced" -> "a pronounced")
    cleaned = cleaned.replace(/\b(a|an)\s*,\s+([a-z]+)/gi, '$1 $2');
    
    // Additional fixes for the issues in the example prompt
    // Remove double commas anywhere
    cleaned = cleaned.replace(/,\s*,/g, ',');
    
    // Fix "slightly, apple" -> "slightly apple" or similar awkward phrasing
    cleaned = cleaned.replace(/(slightly|moderately|very|extremely|somewhat),\s*/gi, '$1 ');
    
    // Fix cases with unnecessary articles in a row ("an an", "a a")
    cleaned = cleaned.replace(/\b(a|an)\s+(a|an)\s+/gi, '$1 ');
    
    // Fix multiple adjectives with unnecessary commas
    cleaned = cleaned.replace(/(\w+),\s*,\s*(\w+)/g, '$1, $2');
    
    // Remove extra spaces around periods
    cleaned = cleaned.replace(/\s+\./g, '.');
    
    // Ensure proper spacing after periods
    cleaned = cleaned.replace(/\.([a-zA-Z])/g, '. $1');
    
    // Fix capitalization after periods
    cleaned = cleaned.replace(/\.\s+([a-z])/g, (match, letter) => 
        `. ${letter.toUpperCase()}`);
    
    // Fix cases where we have "a heart" (should be "a heart-shaped")
    cleaned = cleaned.replace(/\ba\s+(heart|square|round|oval)\s+face/gi, 'a $1-shaped face');
    
    // Final spacing cleanup
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    
    // Fix grammar and article usage issues
    
    // Fix incorrect article usage (a/an) more comprehensively
    cleaned = cleaned.replace(/\b(a|an)\s+([aeiou][a-z]*)\b/gi, (match, article, word) => {
        // Special cases where 'a' is correct before a vowel because of sound
        if (/^uni|^us|^uk|^eu|^ut/i.test(word)) {
            return `a ${word}`;
        }
        return `an ${word}`;
    });
    
    cleaned = cleaned.replace(/\b(a|an)\s+([^aeiou][a-z]*)\b/gi, (match, article, word) => {
        // Special cases where 'an' is correct before a consonant
        if (/^hour|^heir|^honor|^honest/i.test(word)) {
            return `an ${word}`;
        }
        return `a ${word}`;
    });
    
    // Fix redundant phrases like "density in density" and "volume in volume"
    cleaned = cleaned.replace(/(\w+) in \1/gi, "$1");
    
    // Fix improper compound descriptors with hyphens
    cleaned = cleaned.replace(/(\w+)-base (\w+)-nostrils/g, "$1-base, $2-nostrils");
    
    // Additional fixes based on character refinement guidelines
    
    // 1. Capitalize heritage terms
    cleaned = cleaned.replace(/\b(latino|european|asian|african|hispanic|mediterranean|middle eastern|nordic|celtic|slavic|south asian|southeast asian|east asian|pacific islander|indigenous|native american)\b/gi, 
        match => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase());
    
    // 2. Fix compound adjective patterns
    const compoundAdjectivePatterns = [
        // Face and head patterns
        /\b(triangle|oval|round|square|diamond|heart|oblong) (head|face)\b/gi,
        /\b(light|medium|dark)[ -]?(light|medium|dark) (skin|complexion)\b/gi,
        // Nose patterns
        /\b(narrow|wide)[ -]?(bridge|bridged)\b/gi,
        /\b(flared|narrow|wide)[ -]?(nostril|nostrils)\b/gi,
        // Hair length patterns
        /\b(shoulder|hip|waist|mid[\- ]back|chest)[ -]?(length)\b/gi,
        // Specific compound adjectives from example
        /\blight medium\b/gi,
        /\btriangle head\b/gi,
        /\blong face\b/gi,
    ];
    
    compoundAdjectivePatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, match => match.replace(/\s+/g, '-'));
    });
    
    // 3. Convert base forms to adjectives
    cleaned = cleaned.replace(/\b(flared|narrow|wide)[\- ]?nostrils\b/gi, "$1-nostriled");
    cleaned = cleaned.replace(/\b(feminine|masculine|neutral)[\- ]?slope\b/gi, "$1-sloped");
    cleaned = cleaned.replace(/\bwell defined\b/gi, "well-defined");
    cleaned = cleaned.replace(/\bpoorly defined\b/gi, "poorly-defined");
    cleaned = cleaned.replace(/\bsharply defined\b/gi, "sharply-defined");
    cleaned = cleaned.replace(/\bsubtly defined\b/gi, "subtly-defined");
    cleaned = cleaned.replace(/\bsoftly defined\b/gi, "softly-defined");
    
    // 4. Fix improper modifiers and spacing in descriptions
    cleaned = cleaned.replace(/(\w+)[\- ]textured[\- ]mature/gi, "$1 textured");
    cleaned = cleaned.replace(/expressive[\- ]angled/gi, "expressive, angled");
    cleaned = cleaned.replace(/\b(\w+) density\b/gi, "$1 in density");
    cleaned = cleaned.replace(/\b(\w+) volume\b/gi, "$1 in volume");
    
    // 5. Smooth redundant stacks and fix conjunction flow
    cleaned = cleaned.replace(/thin (slightly|full|natural)/gi, "thin, $1");
    cleaned = cleaned.replace(/styled in a (.+) and with a/gi, "styled in a $1 with a");
    cleaned = cleaned.replace(/\b(broad|wide)\s+(broad|wide)\b/gi, match => {
        const words = match.split(/\s+/);
        return words[0] === words[1] ? words[0] : `${words[0]}, subtly ${words[1]}`;
    });
    
    // 6. Fix part repetition more comprehensively
    cleaned = cleaned.replace(/\b(\w+) part part\b/gi, "$1 part");
    cleaned = cleaned.replace(/side part part/gi, "side part");
    cleaned = cleaned.replace(/middle part part/gi, "middle part");
    cleaned = cleaned.replace(/deep part part/gi, "deep part");
    
    // Fix incorrect adjective order - put size before color for eyes
    cleaned = cleaned.replace(/(\w+)\s+(\w+)\s+(eyes)/gi, (match, adj1, adj2, noun) => {
        // Check if first word is a color and second is a size/shape
        const sizeAdjectives = ['small', 'large', 'narrow', 'wide', 'almond', 'round'];
        const isSize1 = sizeAdjectives.some(size => adj1.toLowerCase().includes(size));
        const isSize2 = sizeAdjectives.some(size => adj2.toLowerCase().includes(size));
        
        // If first is color and second is size, swap them
        if (!isSize1 && isSize2) {
            return `${adj2} ${adj1} ${noun}`;
        }
        return match;
    });
    
    // Final clean-up pass
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    
    // Ensure proper capitalization of first letter of each sentence
    cleaned = cleaned.replace(/([.!?]\s+)([a-z])/g, (match, punctuation, letter) => {
        return punctuation + letter.toUpperCase();
    });
    
    // Make sure the first letter of the entire text is capitalized
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    return cleaned;
}

// Generate a natural language description of the character
export function generateNaturalLanguageDescription(completedParams, taxonomy) {
    if (Object.keys(completedParams).length === 0) {
        return "No character parameters selected yet.";
    }
    
    try {
        // Determine gender for pronouns
        const gender = getVal(completedParams, taxonomy, 1, "Gender");
        const isFemale = gender && gender.toLowerCase().includes('female');
        const pronoun = isFemale ? 'She' : 'He';
        const possessive = isFemale ? 'Her' : 'His';
        
        // Build sentences according to the formula guide
        let description = '';
        
        // ------- SENTENCE 1: Identity & Skin -------
        // Format: "A [height] [age descriptor] [gender] of [heritage] heritage with a [build] build and [skin tone], [skin texture] skin."
        const height = formatText(getVal(completedParams, taxonomy, 1, "Height"));
        const age = formatText(getVal(completedParams, taxonomy, 1, "Age"));
        const heritage = getVal(completedParams, taxonomy, 1, "Visual Heritage");
        const build = formatText(getVal(completedParams, taxonomy, 1, "Build"));
        const skinTone = formatText(getVal(completedParams, taxonomy, 1, "Skin Tone"));
        const skinTexture = formatText(getVal(completedParams, taxonomy, 1, "Skin Texture"));
        
        // Get person descriptor and appropriate article
        const personDescriptor = getAgeDescriptor(age, isFemale);
        const article = getArticle(height || age || personDescriptor);
        
        // Get modifiers for height, build, etc.
        const heightModifiers = getModifiers(completedParams, taxonomy, 1, "Height");
        const formattedHeight = heightModifiers.length > 0 ? 
            combineWithModifiers(height, heightModifiers) : height;
            
        const buildModifiers = getModifiers(completedParams, taxonomy, 1, "Build");
        const formattedBuild = buildModifiers.length > 0 ? 
            combineWithModifiers(build, buildModifiers) : build;
            
        const skinToneModifiers = getModifiers(completedParams, taxonomy, 1, "Skin Tone");
        const formattedSkinTone = skinToneModifiers.length > 0 ? 
            combineWithModifiers(skinTone, skinToneModifiers) : skinTone;
            
        const skinTextureModifiers = getModifiers(completedParams, taxonomy, 1, "Skin Texture");
        const formattedSkinTexture = skinTextureModifiers.length > 0 ? 
            combineWithModifiers(skinTexture, skinTextureModifiers) : skinTexture;
        
        // Build sentence 1 with modifiers
        let sentence1 = `${article} ${formattedHeight ? formattedHeight + ' ' : ''}${age ? age + ' ' : ''}${personDescriptor}`;
        
        // Add heritage if available
        if (heritage) {
            const formattedHeritage = heritage.replace(/heritage/i, '').trim();
            sentence1 += ` of ${formattedHeritage} heritage`;
        }
        
        // Add build with modifiers - improve awkward phrasing
        if (formattedBuild) {
            sentence1 += ` with ${article} ${formattedBuild.replace(/slightly,\s*/i, 'slightly ')} build`;
        }
        
        // Add skin details with modifiers
        if (formattedSkinTone || formattedSkinTexture) {
            if (formattedBuild) {
                sentence1 += ` and`;
            } else if (heritage) {
                sentence1 += ` with`;
            }
            
            if (formattedSkinTone && formattedSkinTexture) {
                sentence1 += ` ${formattedSkinTone} skin with ${formattedSkinTexture} texture`;
            } else if (formattedSkinTone) {
                sentence1 += ` ${formattedSkinTone} skin`;
            } else if (formattedSkinTexture) {
                sentence1 += ` ${formattedSkinTexture} skin`;
            }
        }
        
        sentence1 += '.';
        description = sentence1;
        
        // ------- SENTENCE 2: Head & Face Structure -------
        // Format: "She/He has a [head shape] head and a [face shape] face, with a [forehead], a [jawline], and [cheekbones]."
        const headShape = formatText(getVal(completedParams, taxonomy, 2, "Head Shape"));
        const faceShape = formatText(getVal(completedParams, taxonomy, 2, "Face Shape"));
        const forehead = formatText(getVal(completedParams, taxonomy, 2, "Forehead"));
        // Get modifiers for each feature
        const foreheadModifiers = getModifiers(completedParams, taxonomy, 2, "Forehead");
        const formattedForehead = foreheadModifiers.length > 0 ? 
            `${formatText(foreheadModifiers.join(' '))} ${forehead}` : forehead;
        
        const jawline = formatText(getVal(completedParams, taxonomy, 2, "Jawline"));
        const jawlineModifiers = getModifiers(completedParams, taxonomy, 2, "Jawline");
        const formattedJawline = jawlineModifiers.length > 0 ? 
            `${formatText(jawlineModifiers.join(' '))} ${jawline}` : jawline;
        
        const cheekbones = formatText(getVal(completedParams, taxonomy, 2, "Cheekbones"));
        const cheekbonesModifiers = getModifiers(completedParams, taxonomy, 2, "Cheekbones");
        const formattedCheekbones = cheekbonesModifiers.length > 0 ? 
            `${formatText(cheekbonesModifiers.join(' '))} ${cheekbones}` : cheekbones;
        
        // Build sentence 2
        if (headShape || faceShape || formattedForehead || formattedJawline || formattedCheekbones) {
            let sentence2 = `${pronoun} has`;
            
            // Add head and face shapes
            if (headShape && faceShape) {
                // Ensure face shape has -shaped suffix where appropriate
                const faceShapeFormatted = faceShape.toLowerCase().includes('shaped') ? 
                    faceShape : `${faceShape}-shaped`;
                sentence2 += ` a ${headShape} head and a ${faceShapeFormatted} face`;
            } else if (headShape) {
                sentence2 += ` a ${headShape} head`;
            } else if (faceShape) {
                // Ensure face shape has -shaped suffix
                const faceShapeFormatted = faceShape.toLowerCase().includes('shaped') ? 
                    faceShape : `${faceShape}-shaped`;
                sentence2 += ` a ${faceShapeFormatted} face`;
            }
            
            // Add facial features
            const facialFeatures = [];
            if (formattedForehead) facialFeatures.push(`${article} ${formattedForehead} forehead`);
            if (formattedJawline) facialFeatures.push(`${article} ${formattedJawline} jawline`);
            if (formattedCheekbones) facialFeatures.push(`${formattedCheekbones} cheekbones`);
            
            if (facialFeatures.length > 0) {
                if (headShape || faceShape) {
                    sentence2 += `, with ${joinWithCommas(facialFeatures)}`;
                } else {
                    sentence2 += ` ${joinWithCommas(facialFeatures)}`;
                }
            }
            
            sentence2 += '.';
            description = joinSentences(description, sentence2);
        }
        
        // ------- SENTENCE 3: Eyes & Brows -------
        // Format: "Her/His [eye shape], [eye color] eyes are framed by [eyebrow shape] eyebrows."
        const eyes = formatText(getVal(completedParams, taxonomy, 3, "Eyes"));
        const eyeColor = formatText(getVal(completedParams, taxonomy, 3, "Eye Color"));
        const eyebrows = formatText(getVal(completedParams, taxonomy, 3, "Eyebrows"));
        
        // Get modifiers
        const eyeModifiers = getModifiers(completedParams, taxonomy, 3, "Eyes");
        const formattedEyes = eyeModifiers.length > 0 ? 
            `${formatText(eyeModifiers.join(' '))} ${eyes}` : eyes;
            
        const eyebrowModifiers = getModifiers(completedParams, taxonomy, 3, "Eyebrows");
        const formattedEyebrows = eyebrowModifiers.length > 0 ? 
            `${formatText(eyebrowModifiers.join(' '))} ${eyebrows}` : eyebrows;
        
        if (formattedEyes || eyeColor || formattedEyebrows) {
            let sentence3 = '';
            
            // Build eye description
            if (formattedEyes || eyeColor) {
                sentence3 = `${possessive} `;
                
                if (formattedEyes && eyeColor) {
                    sentence3 += `${formattedEyes} ${eyeColor} eyes`;
                } else if (formattedEyes) {
                    sentence3 += `${formattedEyes} eyes`;
                } else if (eyeColor) {
                    sentence3 += `${eyeColor} eyes`;
                }
            }
            
            // Add eyebrows
            if (formattedEyebrows) {
                if (sentence3) {
                    sentence3 += ` are framed by ${formattedEyebrows} eyebrows`;
                } else {
                    sentence3 = `${pronoun} has ${formattedEyebrows} eyebrows`;
                }
            }
            
            if (sentence3) {
                sentence3 += '.';
                description = joinSentences(description, sentence3);
            }
        }
        
        // ------- SENTENCE 4: Nose & Lips -------
        // Format: "She/He has a [nose shape] nose and [lip descriptor] lips."
        const nose = formatText(getVal(completedParams, taxonomy, 3, "Nose"));
        const mouthLips = formatText(getVal(completedParams, taxonomy, 3, "Mouth and Lips"));
        const facialHair = formatText(getVal(completedParams, taxonomy, 3, "Facial Hair"));
        
        // Get modifiers
        const noseModifiers = getModifiers(completedParams, taxonomy, 3, "Nose");
        const formattedNose = noseModifiers.length > 0 ? 
            `${formatText(noseModifiers.join(' '))} ${nose}` : nose;
            
        const lipModifiers = getModifiers(completedParams, taxonomy, 3, "Mouth and Lips");
        const formattedLips = lipModifiers.length > 0 ? 
            `${formatText(lipModifiers.join(' '))} ${mouthLips}` : mouthLips;
        
        if (formattedNose || formattedLips) {
            let sentence4 = `${pronoun} has`;
            
            if (formattedNose && formattedLips) {
                sentence4 += ` ${article} ${formattedNose} nose and ${formattedLips} lips`;
            } else if (formattedNose) {
                sentence4 += ` ${article} ${formattedNose} nose`;
            } else if (formattedLips) {
                sentence4 += ` ${formattedLips} lips`;
            }
            
            sentence4 += '.';
            description = joinSentences(description, sentence4);
        }
        
        // Add facial hair as a separate statement if present
        if (facialHair && !isFemale) {
            description = joinSentences(description, `${pronoun} has ${facialHair}.`);
        }
        
        // ------- SENTENCE 5: Hair -------
        // Format: "Her/His [length], [color] hair is [texture], [density], and [volume], styled in a [bun] with a [parting] and [bangs]."
        const hairLength = formatText(getVal(completedParams, taxonomy, 4, "Hair Length"));
        const hairColor = formatHairColor(getVal(completedParams, taxonomy, 4, "Hair Color"));
        const hairTexture = formatHairTexture(getVal(completedParams, taxonomy, 4, "Hair Texture"));
        const hairDensity = formatText(getVal(completedParams, taxonomy, 4, "Hair Density"));
        const hairVolume = formatText(getVal(completedParams, taxonomy, 4, "Hair Volume"));
        const hairParting = formatText(getVal(completedParams, taxonomy, 4, "Hair Parting"));
        const bangs = formatText(getVal(completedParams, taxonomy, 4, "Bangs/Fringe"));
        const hairStyle = formatText(getVal(completedParams, taxonomy, 4, "Hair Tails/Buns"));
        
        if (hairLength || hairColor || hairTexture || hairDensity || hairVolume || hairStyle) {
            let sentence5 = `${possessive} `;
            
            // Build base hair description: length, color
            const baseDesc = [];
            if (hairLength) baseDesc.push(hairLength);
            if (hairColor) baseDesc.push(hairColor);
            
            if (baseDesc.length > 0) {
                sentence5 += `${baseDesc.join(' ')} `;
            }
            
            // Add hair texture followed by "hair"
            sentence5 += hairTexture ? `${hairTexture} hair` : 'hair';
            
            // Add density and volume as properties - REVISED to avoid redundant phrasing
            const hairProperties = [];
            if (hairDensity) {
                // Fix redundant phrasing
                hairProperties.push(hairDensity.toLowerCase().includes('density') ? 
                    hairDensity : `${hairDensity} in density`);
            }
            
            if (hairVolume) {
                // Fix redundant phrasing
                hairProperties.push(hairVolume.toLowerCase().includes('volume') ? 
                    hairVolume : `${hairVolume} in volume`);
            }
            
            // Add properties with proper conjunction
            if (hairProperties.length > 0) {
                sentence5 += ` is ${joinWithCommas(hairProperties)}`;
            }
            
            // Add styling information
            if (hairStyle || hairParting || bangs) {
                const stylingParts = [];
                
                if (hairStyle) {
                    stylingParts.push(`styled in ${article} ${hairStyle}`);
                }
                
                if (hairParting) {
                    stylingParts.push(`with ${article} ${hairParting} part`);
                }
                
                if (bangs) {
                    stylingParts.push(`with ${bangs} bangs`);
                }
                
                if (stylingParts.length > 0) {
                    if (hairProperties.length > 0) {
                        sentence5 += `, ${joinWithCommas(stylingParts)}`;
                    } else {
                        sentence5 += `, ${joinWithCommas(stylingParts)}`;
                    }
                }
            }
            
            sentence5 += '.';
            description = joinSentences(description, sentence5);
        }
        
        // Apply the cleaning function to fix the description
        return cleanDescription(description);
        
    } catch (error) {
        console.error("Error in description generation:", error);
        return "Character description unavailable.";
    }
}

// Generate a T2I-optimized prompt with error handling
export function generateT2IPrompt(completedParams, taxonomy) {
    try {
        // Create a more T2I-focused version with keywords and less natural language
        const description = generateNaturalLanguageDescription(completedParams, taxonomy);
        
        // Add some T2I-specific enhancements - but keep it simple
        return description + ", professional portrait photography, studio lighting, high detail.";
    } catch (error) {
        console.error("Error generating T2I prompt:", error);
        return "Error generating prompt.";
    }
}

// Copy Summary function
export function copySummary(completedParams, taxonomy) {
    // Create a cleaned up JSON representation of all attributes
    const summary = {
        characterDescription: generateNaturalLanguageDescription(completedParams, taxonomy),
        attributes: {}
    };
    
    // Build organized parameter structure by groups
    for (let groupNum = 1; groupNum <= 4; groupNum++) {
        const group = taxonomy[groupNum];
        if (!group || !group.parameters) continue;
        
        const groupName = typeof group.group === 'string' ? group.group : 
            (group.group && group.group.name ? group.group.name : `Group ${groupNum}`);
        
        summary.attributes[groupName] = {};
        
        group.parameters.forEach(param => {
            if (completedParams[param.id]) {
                const value = completedParams[param.id].value;
                
                // Skip "None" values with improved check
                if (isNoneValue(value)) {
                    return;
                }
                
                // Add parameter as a simple key-value pair
                summary.attributes[groupName][param.name] = value;
                
                // Add modifiers as an array if present
                if (completedParams[param.id].modifiers && 
                    Object.keys(completedParams[param.id].modifiers).length > 0) {
                    
                    const modifiers = [];
                    Object.entries(completedParams[param.id].modifiers).forEach(([modName, modIndex]) => {
                        if (param.modifiers && param.modifiers[modName]) {
                            const modOptions = param.modifiers[modName];
                            if (modOptions && modOptions[modIndex]) {
                                modifiers.push(modOptions[modIndex].name);
                            }
                        }
                    });
                    
                    if (modifiers.length > 0) {
                        // Store modifiers directly with the attribute
                        summary.attributes[groupName][`${param.name} Modifiers`] = modifiers;
                    }
                }
            }
        });
    }
    
    return summary;
}

// Keep the original function name for backward compatibility
export function generateJSONSummary(completedParams, taxonomy) {
    return copySummary(completedParams, taxonomy);
}

// Export this function to make the markdown bio
export function exportSummary(completedParams, taxonomy) {
    // Create a simple markdown summary
    let markdown = "# Character Summary\n\n";
    
    // Add the natural language description
    const description = generateNaturalLanguageDescription(completedParams, taxonomy);
    markdown += description + "\n\n";
    
    // Add attributes by group
    for (let groupNum = 1; groupNum <= 4; groupNum++) {  // Fixed syntax error here
        const group = taxonomy[groupNum];
        if (!group || !group.parameters) continue;
        
        const groupName = typeof group.group === 'string' ? group.group : 
            (group.group && group.group.name ? group.group.name : `Group ${groupNum}`);
        
        markdown += `## ${groupName}\n\n`;
        
        let hasItems = false;
        
        group.parameters.forEach(param => {
            if (completedParams[param.id]) {
                // Skip "None" values
                if (isNoneValue(completedParams[param.id].value)) {
                    return;
                }
                
                hasItems = true;
                markdown += `- **${param.name}**: ${completedParams[param.id].value}\n`;
                
                // Add modifiers if present
                if (completedParams[param.id].modifiers && 
                    Object.keys(completedParams[param.id].modifiers).length > 0) {
                    
                    markdown += "  - *Modifiers*: ";
                    
                    const modifiers = [];
                    Object.entries(completedParams[param.id].modifiers).forEach(([modName, modIndex]) => {
                        if (param.modifiers && param.modifiers[modName]) {
                            const modOptions = param.modifiers[modName];
                            if (modOptions && modOptions[modIndex]) {
                                modifiers.push(modOptions[modIndex].name);
                            }
                        }
                    });
                    
                    markdown += modifiers.join(", ") + "\n";
                }
            }
        });
        
        if (!hasItems) {
            markdown += "*No parameters selected for this group.*\n\n";
        } else {
            markdown += "\n";
        }
    }
    
    return markdown;
}

// Keep the original function name for backward compatibility
export function generateMarkdownBio(completedParams, taxonomy) {
    return exportSummary(completedParams, taxonomy);
}
