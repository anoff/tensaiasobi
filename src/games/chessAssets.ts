import boardLight from '../assets/chess/chess_board_light.png';
import boardDark from '../assets/chess/chess_board_dark.png';
import launcher from '../assets/chess/chess_launcher.png';
import whiteKing from '../assets/chess/chess_white_king.png';
import whiteQueen from '../assets/chess/chess_white_queen.png';
import whiteRook from '../assets/chess/chess_white_rook.png';
import whiteBishop from '../assets/chess/chess_white_bishop.png';
import whiteKnight from '../assets/chess/chess_white_knight.png';
import whitePawn from '../assets/chess/chess_white_pawn.png';
import blackKing from '../assets/chess/chess_black_king.png';
import blackQueen from '../assets/chess/chess_black_queen.png';
import blackRook from '../assets/chess/chess_black_rook.png';
import blackBishop from '../assets/chess/chess_black_bishop.png';
import blackKnight from '../assets/chess/chess_black_knight.png';
import blackPawn from '../assets/chess/chess_black_pawn.png';
import type { Color, PieceSymbol } from 'chess.js';

export const CHESS_BOARD_LIGHT = boardLight;
export const CHESS_BOARD_DARK = boardDark;
export const CHESS_LAUNCHER = launcher;

const WHITE: Record<PieceSymbol, string> = {
  k: whiteKing,
  q: whiteQueen,
  r: whiteRook,
  b: whiteBishop,
  n: whiteKnight,
  p: whitePawn,
};

const BLACK: Record<PieceSymbol, string> = {
  k: blackKing,
  q: blackQueen,
  r: blackRook,
  b: blackBishop,
  n: blackKnight,
  p: blackPawn,
};

export function pieceSrc(color: Color, type: PieceSymbol): string {
  return color === 'w' ? WHITE[type] : BLACK[type];
}

export const PROMOTION_PIECES: readonly PieceSymbol[] = ['q', 'r', 'b', 'n'];
