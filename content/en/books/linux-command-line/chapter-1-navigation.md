# Navigating the Filesystem

The Linux command line is a powerful interface that gives you direct access to your computer's operating system. Let's start with the most fundamental skill: navigating the filesystem.

## The Filesystem Structure

Linux uses a hierarchical tree structure starting from the **root** directory `/`:

```
/
├── home/
│   └── username/        ← Your home directory
│       ├── Documents/
│       ├── Downloads/
│       └── Desktop/
├── etc/                 ← System configuration files
├── usr/                 ← User programs and utilities
├── var/                 ← Variable data (logs, etc)
└── tmp/                 ← Temporary files
```

## Essential Navigation Commands

### `pwd` — Print Working Directory

Always know where you are:

```bash
$ pwd
/home/alice
```

### `ls` — List Directory Contents

```bash
# Basic listing
$ ls

# Detailed listing with permissions
$ ls -la

# Human-readable file sizes
$ ls -lh

# Sort by modification time
$ ls -lt
```

Example output of `ls -la`:

```
total 48
drwxr-xr-x  8 alice alice 4096 Apr 21 12:00 .
drwxr-xr-x 24 root  root  4096 Apr 20 09:00 ..
-rw-------  1 alice alice  220 Apr 20 09:00 .bash_profile
drwxr-xr-x  2 alice alice 4096 Apr 21 11:00 Documents
drwxr-xr-x  2 alice alice 4096 Apr 21 10:30 Downloads
```

### `cd` — Change Directory

```bash
# Go to home directory
cd ~
cd        # same as cd ~

# Go to previous directory
cd -

# Absolute path
cd /usr/local/bin

# Relative path
cd Documents/Projects

# Go up one level
cd ..

# Go up two levels
cd ../..
```

## Tab Completion

A major productivity tip: press **Tab** to auto-complete:

```bash
$ cd Doc[TAB]
$ cd Documents/    ← auto-completed!
```

Press Tab twice to see all options when there are multiple matches.

## Summary

You've learned:

- The Linux filesystem tree structure
- `pwd` to show your current location
- `ls` to list directory contents (with useful flags)
- `cd` to navigate directories
- Tab completion to work faster

In the next chapter, we'll learn to **work with files and directories**.
