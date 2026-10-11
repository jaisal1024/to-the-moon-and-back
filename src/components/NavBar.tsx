'use client';

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Popover,
  Toolbar,
  Typography,
} from '@mui/material';
import { clsx } from 'clsx';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';
import type { NavCollection } from 'src/cms/collections';
import useCollectionSlug from 'src/hooks/useCollectionSlug';

import Link from './Link';

/*
if the href is equal to the router pathname then underline the text
*/
function CollectionListItem({ title, href }: { href: string; title: string }) {
  const pathname = usePathname();
  return (
    <ListItem disablePadding>
      <ListItemButton
        href={href}
        className={clsx(href === pathname && 'underline underline-offset-8')}
        data-testid={`navbar-list-item-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <Typography variant="body1">{title}</Typography>
      </ListItemButton>
    </ListItem>
  );
}

function CollectionList({ collections }: { collections: NavCollection[] }) {
  return (
    <List>
      <CollectionListItem title="Home" href="/" />
      {collections.map((collection) => (
        <CollectionListItem
          key={collection.id}
          title={collection.title || 'Untitled'}
          href={`/collections/${collection.slug}`}
        />
      ))}
    </List>
  );
}

/** `collections` comes from the server-rendered Layout, so the menu opens instantly. */
function NavBarComponent({ collections }: { collections: NavCollection[] }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [collectionAnchorEl, setCollectionAnchorEl] = useState<HTMLElement | null>(null);
  const collectionSlug = useCollectionSlug();
  const pathname = usePathname();

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ paddingTop: 1 }}>
      <Toolbar variant="dense">
        <Link href="/" noLinkStyle className="cursor-pointer" data-testid="navbar-home-link">
          <Typography variant={pathname === '/' ? 'h1' : 'h2'} color="inherit">
            Jaisal Friedman
          </Typography>
        </Link>
        <Box sx={{ flexGrow: 1 }} />
        <div
          className={clsx(
            (collectionSlug || pathname === '/') && 'underline underline-offset-8',
            'hidden cursor-pointer p-1 sm:block',
          )}
          onClick={() => setShowCollections(true)}
          ref={(node) => setCollectionAnchorEl(node)}
          data-testid="navbar-collections-button"
        >
          <div className="flex flex-row items-center">
            <Typography variant="h4" color="inherit">
              Collections
            </Typography>
            <ArrowDropDownIcon />
          </div>
        </div>
        <div
          className={clsx(pathname === '/blog' && 'underline underline-offset-8', 'hidden cursor-pointer p-1 sm:block')}
        >
          <Link href="/blog" noLinkStyle data-testid="navbar-blog-link">
            <Typography variant="h4" color="inherit">
              Blog
            </Typography>
          </Link>
        </div>
        <div
          className={clsx(
            pathname === '/about' && 'underline underline-offset-8',
            'hidden cursor-pointer p-1 ml-1 sm:block',
          )}
        >
          <Link href="/about" noLinkStyle data-testid="navbar-about-link">
            <Typography variant="h4" color="inherit">
              About
            </Typography>
          </Link>
        </div>
        <Popover
          id={'collectionPopover'}
          open={showCollections}
          anchorEl={collectionAnchorEl}
          onClose={() => setShowCollections(false)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Paper sx={{ minWidth: 150, minHeight: 45 }}>
            <CollectionList collections={collections} />
          </Paper>
        </Popover>
        <IconButton
          color="inherit"
          aria-label="menu"
          className="sm:hidden"
          onClick={() => setMobileDrawerOpen(true)}
          data-testid="navbar-mobile-menu-button"
        >
          <MenuIcon />
        </IconButton>
        <Dialog open={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} fullScreen>
          <DialogTitle sx={{ m: 0, p: 2 }}>
            <IconButton
              aria-label="close"
              onClick={() => setMobileDrawerOpen(false)}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
              data-testid="navbar-mobile-close-button"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography variant="h3" data-testid="mobile-menu-collections-heading">
              Collections
            </Typography>
            <CollectionList collections={collections} />
            <Typography variant="h3" data-testid="mobile-menu-blog-heading">
              Blog
            </Typography>
            <CollectionListItem title="Blog" href="/blog" />
            <Typography variant="h3" data-testid="mobile-menu-about-heading">
              About
            </Typography>
            <CollectionListItem title="About" href="/about" />
          </DialogContent>
        </Dialog>
      </Toolbar>
    </AppBar>
  );
}

const NavBar = React.memo(NavBarComponent);

export default NavBar;
