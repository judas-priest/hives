/**
 * Banner UI - Displays welcome message
 */

import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';

/**
 * Display beautiful ASCII banner
 */
export function showBanner() {
  const hiveGradient = gradient(['#00D9FF', '#7B61FF']);

  const banner = `
╦ ╦╦╦  ╦╔═╗╔═╗  ╔╦╗╔═╗╔╦╗╔═╗╦═╗╔╗╔  ╔═╗╦  ╦
╠═╣║╚╗╔╝║╣ ╚═╗  ║║║║ ║ ║║║╣ ╠╦╝║║║  ║  ║  ║
╩ ╩╩ ╚╝ ╚═╝╚═╝  ╩ ╩╚═╝═╩╝╚═╝╩╚═╝╚╝  ╚═╝╩═╝╩
  `;

  const coloredBanner = hiveGradient(banner);

  console.log(coloredBanner);
  console.log(
    boxen(
      chalk.cyan.bold('Modern CLI') + chalk.gray(' · ') +
      chalk.yellow('Powered by Polza AI') + '\n' +
      chalk.dim('Inspired by Gemini CLI'),
      {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        margin: { top: 0, bottom: 1, left: 2, right: 0 },
        borderStyle: 'round',
        borderColor: 'cyan',
        dimBorder: true,
      }
    )
  );

  console.log(chalk.gray('  Type ') + chalk.cyan('/help') + chalk.gray(' for commands, ') + chalk.cyan('/exit') + chalk.gray(' to quit\n'));
}

/**
 * Display minimal banner for non-interactive mode
 */
export function showMinimalBanner() {
  console.log(chalk.cyan.bold('Hives Modern CLI') + chalk.gray(' · Polza AI'));
}
