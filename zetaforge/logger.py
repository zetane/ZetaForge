import os
import sys
import platform
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from rich.console import Console
from rich.prompt import Prompt, Confirm
from rich.panel import Panel
from rich.text import Text
from rich.table import Table
from rich.columns import Columns
from rich.markdown import Markdown
from rich.console import Console
from rich.progress import (
    Progress,
    SpinnerColumn,
    BarColumn,
    TextColumn,
    DownloadColumn,
    TransferSpeedColumn,
    TimeRemainingColumn
)
from rich import print as rprint
from enum import Enum

class LogLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"

class CliLogger:
    """Enhanced CLI logger with rich formatting and progress bars"""

    BANNER = """
███████╗███████╗████████╗ █████╗ ███████╗ ██████╗ ██████╗  ██████╗ ███████╗
╚══███╔╝██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
  ███╔╝ █████╗     ██║   ███████║█████╗  ██║   ██║██████╔╝██║  ███╗█████╗
 ███╔╝  ██╔══╝     ██║   ██╔══██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
███████╗███████╗   ██║   ██║  ██║██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
    """

    def __init__(self):
        self.console = Console()
        self._setup_styles()

    def _setup_styles(self):
        """Setup color styles for different message types"""
        self.styles = {
            LogLevel.INFO: "cyan",
            LogLevel.WARNING: "yellow",
            LogLevel.ERROR: "red",
            LogLevel.SUCCESS: "green"
        }

    def _get_system_info(self) -> Table:
        """Create a table with system information"""
        table = Table(show_header=False, border_style="bright_blue")

        # Get Python version info
        py_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"

        # Add rows to table
        table.add_row("System Time:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        table.add_row("Working Dir:", os.getcwd())
        table.add_row("Platform:", platform.system())
        table.add_row("Architecture:", platform.machine())
        table.add_row("Python:", py_version)

        return table

    def show_banner(self, version: str):
        """Display the ZetaForge ASCII banner with version"""
        banner_panel = Panel(
            Text(self.BANNER, style="blue bold"),
            subtitle=f"v{version}",
            subtitle_align="right"
        )
        self.console.print(banner_panel)
        self.console.print()  # Add spacing after banner

        system_info = self._get_system_info()
        self.console.print(Panel(
            system_info,
            title="[yellow]System Information[/yellow]",
            border_style="bright_blue"
        ))
        self.console.print()

    def log(self, message: str, level: LogLevel = LogLevel.INFO, emoji: str = ""):
        """Log a message with appropriate styling"""
        style = self.styles[level]
        prefix = {
            LogLevel.INFO: "ℹ️ ",
            LogLevel.WARNING: "⚠️ ",
            LogLevel.ERROR: "❌ ",
            LogLevel.SUCCESS: "✅ "
        }.get(level, "")

        if emoji:
            prefix = f"{emoji} "

        self.console.print(f"{prefix}{message}", style=style)

    def error(self, message: str):
        """Log an error message"""
        self.log(message, LogLevel.ERROR)

    def warning(self, message: str):
        """Log a warning message"""
        self.log(message, LogLevel.WARNING)

    def success(self, message: str):
        """Log a success message"""
        self.log(message, LogLevel.SUCCESS)

    def info(self, message: str, emoji: str = ""):
        """Log an info message"""
        self.log(message, LogLevel.INFO, emoji)

    def create_download_progress(self) -> Progress:
        """Create a rich progress bar for downloads"""
        return Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]{task.description}"),
            BarColumn(bar_width=40),
            "[progress.percentage]{task.percentage:>3.0f}%",
            DownloadColumn(),
            TransferSpeedColumn(),
            TimeRemainingColumn(),
            console=self.console
        )

    def prompt(self, message: str, default: Optional[str] = None, password: bool = False) -> str:
        """
        Get user input with optional default value

        Args:
            message: Prompt message
            default: Default value if user presses enter
            password: Whether to hide input

        Returns:
            str: User input
        """
        if password:
            return Prompt.ask(message, password=True)
        return Prompt.ask(message, default=default)

    def confirm(self, message: str, default: bool = True) -> bool:
        """
        Get yes/no confirmation from user

        Args:
            message: Confirmation message
            default: Default value if user presses enter

        Returns:
            bool: True for yes, False for no
        """
        return Confirm.ask(message, default=default)

    def show_menu(self, title: str, options: Dict[str, str]) -> str:
        """
        Display a menu and get user selection

        Args:
            title: Menu title
            options: Dictionary of option keys and descriptions

        Returns:
            str: Selected option key
        """
        # Create menu table
        menu = Table(show_header=False, border_style="bright_blue", box=None)

        # Add options to table
        for key, description in options.items():
            menu.add_row(f"[cyan]{key}[/cyan]", description)

        # Show menu in panel
        self.console.print(Panel(
            menu,
            title=f"[yellow]{title}[/yellow]",
            border_style="bright_blue"
        ))

        # Get valid choice
        while True:
            choice = self.prompt("Enter your choice").lower()
            if choice in options:
                return choice
            self.error(f"Invalid choice. Please select from: {', '.join(options.keys())}")

    def show_numbered_menu(self, title: str, options: List[str]) -> int:
        """
        Display a numbered menu and get user selection

        Args:
            title: Menu title
            options: List of options

        Returns:
            int: Selected option index
        """
        # Create menu table
        menu = Table(show_header=False, border_style="bright_blue", box=None)

        # Add numbered options
        for i, option in enumerate(options, 1):
            menu.add_row(f"[cyan]{i}[/cyan]", option)

        # Show menu in panel
        self.console.print(Panel(
            menu,
            title=f"[yellow]{title}[/yellow]",
            border_style="bright_blue"
        ))

        # Get valid choice
        while True:
            try:
                choice = int(self.prompt("Enter number"))
                if 1 <= choice <= len(options):
                    return choice - 1
                self.error(f"Please enter a number between 1 and {len(options)}")
            except ValueError:
                self.error("Please enter a valid number")

    def show_multi_select(self, title: str, options: List[str]) -> List[int]:
        """
        Display menu for selecting multiple options

        Args:
            title: Menu title
            options: List of options

        Returns:
            List[int]: List of selected indices
        """
        # Create menu table
        menu = Table(show_header=False, border_style="bright_blue", box=None)

        # Add numbered options
        for i, option in enumerate(options, 1):
            menu.add_row(f"[cyan]{i}[/cyan]", option)

        # Show menu in panel
        self.console.print(Panel(
            menu,
            title=f"[yellow]{title}[/yellow]",
            subtitle="[cyan]Enter numbers separated by commas (e.g., 1,3,4)[/cyan]",
            border_style="bright_blue"
        ))

        # Get valid choices
        while True:
            try:
                choices = self.prompt("Enter numbers").split(',')
                indices = [int(c.strip()) - 1 for c in choices]
                if all(0 <= i < len(options) for i in indices):
                    return indices
                self.error(f"Please enter numbers between 1 and {len(options)}")
            except ValueError:
                self.error("Please enter valid numbers separated by commas")
