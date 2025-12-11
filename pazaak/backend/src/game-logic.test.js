import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PazaakGame } from './game-logic.js';

describe('PazaakGame', () => {
  describe('Game Initialization', () => {
    it('should create a game with two players', () => {
      const game = new PazaakGame(1, 2);

      assert.strictEqual(game.player1.id, 1);
      assert.strictEqual(game.player2.id, 2);
      assert.strictEqual(game.roundNumber, 1);
      assert.strictEqual(game.gameOver, false);
    });

    it('should initialize players with correct deck sizes', () => {
      const game = new PazaakGame(1, 2);

      assert.strictEqual(game.player1.mainDeck.length, 40); // 4 of each 1-10
      assert.strictEqual(game.player2.mainDeck.length, 40);
      assert.strictEqual(game.player1.sideDeck.length, 4);
      assert.strictEqual(game.player2.sideDeck.length, 4);
    });

    it('should start with player1 as current player', () => {
      const game = new PazaakGame(1, 2);
      assert.strictEqual(game.currentPlayer, 1);
    });
  });

  describe('Drawing Cards', () => {
    it('should draw a card and increase player score', () => {
      const game = new PazaakGame(1, 2);
      const initialDeckSize = game.player1.mainDeck.length;

      const result = game.drawMainCard(1);

      assert.ok(!result.error);
      assert.strictEqual(game.player1.score, result.newScore);
      assert.strictEqual(game.player1.mainDeck.length, initialDeckSize - 1);
    });

    it('should bust if score goes over 20', () => {
      const game = new PazaakGame(1, 2);
      game.player1.score = 18;

      // Force a high card
      game.player1.mainDeck = [{ type: 'main', value: 10 }];

      const result = game.drawMainCard(1);

      assert.strictEqual(result.busted, true);
      assert.strictEqual(game.player1.busted, true);
    });

    it('should not allow drawing when standing', () => {
      const game = new PazaakGame(1, 2);
      game.player1.standing = true;

      const result = game.drawMainCard(1);

      assert.ok(result.error);
    });
  });

  describe('Playing Side Cards', () => {
    it('should play a positive side card', () => {
      const game = new PazaakGame(1, 2);
      game.player1.score = 10;
      game.player1.sideDeck = [{ type: 'side', value: 3, modifier: '+' }];

      const result = game.playSideCard(1, 0);

      assert.ok(!result.error);
      assert.strictEqual(result.valueChange, 3);
      assert.strictEqual(game.player1.score, 13);
      assert.strictEqual(game.player1.sideDeck.length, 0);
    });

    it('should play a negative side card', () => {
      const game = new PazaakGame(1, 2);
      game.player1.score = 18;
      game.player1.sideDeck = [{ type: 'side', value: 4, modifier: '-' }];

      const result = game.playSideCard(1, 0);

      assert.ok(!result.error);
      assert.strictEqual(result.valueChange, -4);
      assert.strictEqual(game.player1.score, 14);
    });

    it('should handle +/- card with player choice', () => {
      const game = new PazaakGame(1, 2);
      game.player1.score = 15;
      game.player1.sideDeck = [{ type: 'side', value: 6, modifier: '+/-' }];

      const result = game.playSideCard(1, 0, '-');

      assert.strictEqual(result.valueChange, -6);
      assert.strictEqual(game.player1.score, 9);
    });
  });

  describe('Standing', () => {
    it('should mark player as standing', () => {
      const game = new PazaakGame(1, 2);

      const result = game.stand(1);

      assert.strictEqual(game.player1.standing, true);
    });

    it('should end round when both players are standing', () => {
      const game = new PazaakGame(1, 2);
      game.player1.score = 18;
      game.player2.score = 16;

      game.stand(1);
      const result = game.stand(2);

      assert.ok(result.roundNumber !== undefined);
      assert.strictEqual(result.winner, 1); // Player 1 has higher score
    });
  });

  describe('Round Logic', () => {
    it('should award round to player with higher score', () => {
      const game = new PazaakGame(1, 2);
      game.player1.score = 20;
      game.player2.score = 18;
      game.player1.standing = true;
      game.player2.standing = true;

      const result = game.endRound();

      assert.strictEqual(result.winner, 1);
      assert.strictEqual(game.player1.roundsWon, 1);
    });

    it('should award round to opponent if player busts', () => {
      const game = new PazaakGame(1, 2);
      game.player1.score = 25;
      game.player1.busted = true;
      game.player2.score = 18;
      game.player2.standing = true;

      const result = game.endRound();

      assert.strictEqual(result.winner, 2);
      assert.strictEqual(game.player2.roundsWon, 1);
    });

    it('should start a new round after round ends', () => {
      const game = new PazaakGame(1, 2);
      game.player1.score = 20;
      game.player2.score = 18;
      game.player1.standing = true;
      game.player2.standing = true;

      game.endRound();

      assert.strictEqual(game.roundNumber, 2);
      assert.strictEqual(game.player1.score, 0);
      assert.strictEqual(game.player2.score, 0);
      assert.strictEqual(game.player1.standing, false);
      assert.strictEqual(game.player2.standing, false);
    });
  });

  describe('Match Logic', () => {
    it('should end game when a player wins 3 rounds', () => {
      const game = new PazaakGame(1, 2);
      game.player1.roundsWon = 3;

      const result = game.endRound();

      assert.strictEqual(result.gameOver, true);
      assert.strictEqual(result.matchWinner, 1);
    });

    it('should not end game before 3 rounds are won', () => {
      const game = new PazaakGame(1, 2);
      game.player1.roundsWon = 2;
      game.player2.roundsWon = 1;

      const result = game.endRound();

      assert.strictEqual(result.gameOver, false);
    });
  });

  describe('Game State', () => {
    it('should return personalized game state for each player', () => {
      const game = new PazaakGame(1, 2);
      game.player1.score = 15;
      game.player2.score = 12;

      const state1 = game.getGameState(1);
      const state2 = game.getGameState(2);

      // Player 1 sees their own side deck
      assert.ok(state1.player.sideDeck);
      // But only opponent's side deck count
      assert.ok(state1.opponent.sideDeckCount !== undefined);
      assert.ok(!state1.opponent.sideDeck);

      // Vice versa for player 2
      assert.ok(state2.player.sideDeck);
      assert.ok(!state2.opponent.sideDeck);
    });
  });
});
