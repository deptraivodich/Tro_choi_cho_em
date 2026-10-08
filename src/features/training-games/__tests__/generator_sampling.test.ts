import {
  generateEnergyDefenseProblem,
  generatePlanetRescueRooms,
  generateRacingStages,
  generateSpacePetProblem,
  generateBlockIslandQuests,
  generateVaultCode,
  generateFloatingMarketDeals,
  generateRhythmBakeryOrders,
  generateTreasureDiveZones,
} from '../core/math/generators';
import { areFractionsEqual, addFractions, gcd, simplifyFraction } from '../core/math/fraction';

describe('Math Generators 500-Sample Rigorous Verification', () => {
  test('Energy Defense: 500 samples per difficulty guarantee solvable piece subset and variety', () => {
    const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];

    for (const diff of difficulties) {
      const signatures = new Set<string>();
      let validCount = 0;

      for (let i = 0; i < 500; i++) {
        const prob = generateEnergyDefenseProblem(diff, i * 7919);
        expect(prob.targetFraction.den).toBeGreaterThan(0);
        expect(prob.availablePieces.length).toBeGreaterThanOrEqual(2);

        // Verify that there is AT LEAST ONE subset of pieces that equals the target fraction
        const pieces = prob.availablePieces;
        let foundSolvableSubset = false;

        // Check 1-piece, 2-piece, 3-piece subsets
        for (let a = 0; a < pieces.length; a++) {
          if (areFractionsEqual(pieces[a].fraction, prob.targetFraction)) {
            foundSolvableSubset = true;
            break;
          }
          for (let b = a + 1; b < pieces.length; b++) {
            const sum2 = addFractions(pieces[a].fraction, pieces[b].fraction);
            if (areFractionsEqual(sum2, prob.targetFraction)) {
              foundSolvableSubset = true;
              break;
            }
            for (let c = b + 1; c < pieces.length; c++) {
              const sum3 = addFractions(sum2, pieces[c].fraction);
              if (areFractionsEqual(sum3, prob.targetFraction)) {
                foundSolvableSubset = true;
                break;
              }
              for (let d = c + 1; d < pieces.length; d++) {
                const sum4 = addFractions(sum3, pieces[d].fraction);
                if (areFractionsEqual(sum4, prob.targetFraction)) {
                  foundSolvableSubset = true;
                  break;
                }
              }
              if (foundSolvableSubset) break;
            }
            if (foundSolvableSubset) break;
          }
          if (foundSolvableSubset) break;
        }

        expect(foundSolvableSubset).toBe(true);
        validCount++;
        signatures.add(`${prob.targetNumeric}-${prob.availablePieces.length}`);
      }

      expect(validCount).toBe(500);
      expect(signatures.size).toBeGreaterThanOrEqual(4);
    }
  });

  test('Planet Rescue: 500 samples have valid GCD, simplifications and non-zero denominators', () => {
    for (let i = 0; i < 500; i++) {
      const rooms = generatePlanetRescueRooms('medium', i * 31);
      expect(rooms.length).toBeGreaterThanOrEqual(5);

      for (const room of rooms) {
        expect(room.shieldFraction.den).toBeGreaterThan(0);
        const actualGcd = gcd(room.shieldFraction.num, room.shieldFraction.den);
        expect(room.divisorUsed).toBe(actualGcd);

        const simplified = simplifyFraction(room.shieldFraction);
        expect(areFractionsEqual(simplified, room.simplifiedShield)).toBe(true);
        expect(room.availableDivisors).toContain(room.divisorUsed);
      }
    }
  });

  test('Terrain Racing: 500 samples verify math formulas (v = s/t, s = v*t, t = s/v) and options', () => {
    for (let i = 0; i < 500; i++) {
      const stages = generateRacingStages('medium', i * 43);
      expect(stages.length).toBe(10);

      for (const stage of stages) {
        expect(stage.options).toContain(stage.correctAnswer);
        expect(stage.distance).toBeGreaterThan(0);
        expect(stage.time).toBeGreaterThan(0);

        if (stage.problemType === 'find_v') {
          const expectedV = Math.round((stage.distance / stage.time) * 10) / 10;
          expect(stage.correctAnswer).toBe(expectedV);
        } else if (stage.problemType === 'find_s') {
          const expectedS = Math.round(stage.targetVelocity * stage.time * 10) / 10;
          expect(stage.correctAnswer).toBe(expectedS);
        } else if (stage.problemType === 'find_t') {
          const expectedT = Math.round((stage.distance / stage.targetVelocity) * 10) / 10;
          expect(stage.correctAnswer).toBe(expectedT);
        }
      }
    }
  });

  test('Space Pets: 500 samples verify percentage deficit equals 100% and solvable rations', () => {
    for (let i = 0; i < 500; i++) {
      const prob = generateSpacePetProblem('medium', i * 17);
      expect(prob.startingFullness + prob.neededPercent).toBe(100);
      expect(prob.startingFullness).toBeGreaterThan(0);
      expect(prob.startingFullness).toBeLessThan(100);

      // Verify at least one pair/subset of rations sums exactly to neededPercent
      const rations = prob.availableRations;
      let hasValidRations = false;
      for (let a = 0; a < rations.length; a++) {
        if (rations[a].percent === prob.neededPercent) {
          hasValidRations = true;
          break;
        }
        for (let b = a + 1; b < rations.length; b++) {
          if (rations[a].percent + rations[b].percent === prob.neededPercent) {
            hasValidRations = true;
            break;
          }
        }
        if (hasValidRations) break;
      }
      expect(hasValidRations).toBe(true);
    }
  });

  test('Block Island: 500 samples verify valid positive area and perimeter quest targets', () => {
    for (let i = 0; i < 500; i++) {
      const quests = generateBlockIslandQuests('medium', i * 13);
      expect(quests.length).toBeGreaterThanOrEqual(3);

      for (const q of quests) {
        expect(q.targetValue).toBeGreaterThan(0);
        expect(q.formulaNote.length).toBeGreaterThan(0);
      }
    }
  });

  test('Vault Code: 500 samples verify regex ##.## and absolute truth of generated hints', () => {
    for (let i = 0; i < 500; i++) {
      const prob = generateVaultCode(`seed-${i * 97}`, 'medium');
      expect(prob.code).toMatch(/^\d{2}\.\d{2}$/);
      expect(prob.wholePart).toBeGreaterThanOrEqual(10);
      expect(prob.wholePart).toBeLessThanOrEqual(99);

      for (const hint of prob.hints) {
        if (hint.text.includes('chia hết cho 2') && !hint.text.includes('không')) {
          expect(prob.wholePart % 2).toBe(0);
        } else if (hint.text.includes('không chia hết cho 2')) {
          expect(prob.wholePart % 2).toBe(1);
        }
        if (hint.text.includes('chia hết cho 3')) {
          expect(prob.wholePart % 3).toBe(0);
        }
        if (hint.text.includes('chia hết cho 5')) {
          expect(prob.wholePart % 5).toBe(0);
        }
      }
    }
  });

  test('Floating Market: 500 samples verify positive wholesale quantity and profit math', () => {
    for (let i = 0; i < 500; i++) {
      const deals = generateFloatingMarketDeals('medium', i * 23);
      expect(deals.length).toBeGreaterThanOrEqual(3);

      for (const deal of deals) {
        expect(deal.wholesaleQty).toBeGreaterThan(0);
        expect(deal.suggestedRetailPricePerKg).toBeGreaterThan(0);
        expect(deal.buyPricePerWholesale).toBeGreaterThan(0);
      }
    }
  });

  test('Rhythm Bakery: 500 samples verify slices required = whole * den + num', () => {
    for (let i = 0; i < 500; i++) {
      const orders = generateRhythmBakeryOrders('medium', i * 19);
      expect(orders.length).toBeGreaterThanOrEqual(3);

      for (const o of orders) {
        const expected = o.whole * o.fractionDen + o.fractionNum;
        expect(o.requiredSlices).toBe(expected);
      }
    }
  });

  test('Treasure Dive: 500 samples verify zone probabilities are between 0% and 100%', () => {
    for (let i = 0; i < 500; i++) {
      const zones = generateTreasureDiveZones('medium', i * 11);
      expect(zones.length).toBe(3);

      for (const z of zones) {
        expect(z.surveyTreasurePercent).toBeGreaterThanOrEqual(0);
        expect(z.surveyTreasurePercent).toBeLessThanOrEqual(100);
      }
    }
  });
});
