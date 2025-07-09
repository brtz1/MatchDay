# ~/.bashrc

# Enable Git branch display in prompt
if [ -f "/etc/profile.d/git-prompt.sh" ]; then
  source /etc/profile.d/git-prompt.sh
fi

# Set prompt with Git branch info
export PS1='\[\033[32m\]\u@\h\[\033[0m\]:\[\033[34m\]\w\[\033[33m\]$(__git_ps1 " (%s)")\[\033[0m\]\n\$ '

# Some handy aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias gs='git status'
alias gc='git commit'
alias gp='git push'
alias gl='git pull'
alias ..='cd ..'
alias ...='cd ../..'

# Enable colored output
export CLICOLOR=1
export LSCOLORS=ExFxBxDxCxegedabagacad

# Fix for npm global packages on Windows

export PATH="$PATH:/c/Users/$USERNAME/AppData/Roaming/npm"
# History settings
export HISTCONTROL=ignoredups:erasedups
export HISTSIZE=10000
export HISTFILESIZE=20000

# Editor
export EDITOR=nano
