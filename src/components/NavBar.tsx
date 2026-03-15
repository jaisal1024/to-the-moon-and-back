'use client';

import { useLazyQuery } from '@apollo/client/react';
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
import { useRef, useState } from 'react';
import { graphql } from 'src/gql/gql';
import useCollectionSlug from 'src/hooks/useCollectionSlug';
import { GET_COLLECTIONS_SORT } from 'src/utils/constants';

import Link from './Link';
import LoadingSpinner from './LoadingSpinner';

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

function CollectionList({
  collectionData,
}: {
  collectionData: unknown; // Bypassing deep partial strictness for NavBar
}) {
  return (
    <List>
      <CollectionListItem title="Home" href="/" />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(collectionData as any)?.allCollections?.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (collection: any, i: number) =>
          collection && (
            <CollectionListItem
              key={collection._id ?? i}
              title={collection.title || 'Untitled'}
              href={`/collections/${collection.slug?.current || ''}`}
            />
          ),
      )}
    </List>
  );
}

export default function NavBar() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const collectionAnchorRef = useRef<HTMLDivElement>(null);
  const [
    getNavBarCollections,
    { data: collectionData, error: fetchError, loading },
  ] = useLazyQuery(
    graphql(/* GraphQL */ `
      query GetNavBarCollections(
        $sort: [CollectionsSorting!]
        $limit: Int = 20
      ) {
        allCollections(sort: $sort, limit: $limit) {
          _id
          title
          slug {
            current
          }
        }
      }
    `),
    {
      variables: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sort: GET_COLLECTIONS_SORT as any,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  );
  const collectionSlug = useCollectionSlug();
  const pathname = usePathname();

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{ paddingTop: 1 }}
    >
      <Toolbar variant="dense">
        <Link
          href="/"
          noLinkStyle
          className="cursor-pointer"
          data-testid="navbar-home-link"
        >
          <Typography variant="h2" color="inherit">
            Jaisal Friedman
          </Typography>
        </Link>
        <Box sx={{ flexGrow: 1 }} />
        <div
          className={clsx(
            (collectionSlug || pathname === '/') &&
              'underline underline-offset-8',
            'hidden cursor-pointer p-1 sm:block',
          )}
          onClick={() => {
            setShowCollections(true);
            getNavBarCollections();
          }}
          ref={collectionAnchorRef}
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
          className={clsx(
            pathname === '/about' && 'underline underline-offset-8',
            'hidden cursor-pointer p-1 sm:block',
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
          anchorEl={collectionAnchorRef.current}
          onClose={() => setShowCollections(false)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Paper sx={{ minWidth: 150, minHeight: 45 }}>
            {loading && <LoadingSpinner />}
            {fetchError && (
              <Typography variant="body2" className="py-2 text-dangerRed">
                Failed to fetch collections
              </Typography>
            )}
            {collectionData && (
              <CollectionList collectionData={collectionData} />
            )}
          </Paper>
        </Popover>
        <IconButton
          color="inherit"
          aria-label="menu"
          className="sm:hidden"
          onClick={() => {
            setMobileDrawerOpen(true);
            getNavBarCollections();
          }}
          data-testid="navbar-mobile-menu-button"
        >
          <MenuIcon />
        </IconButton>
        <Dialog
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          fullScreen
        >
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
            <Typography
              variant="h3"
              data-testid="mobile-menu-collections-heading"
            >
              Collections
            </Typography>
            {loading && <LoadingSpinner />}
            {fetchError && (
              <Typography variant="body2" className="py-2 text-dangerRed">
                Failed to fetch collections
              </Typography>
            )}
            {collectionData && (
              <CollectionList collectionData={collectionData} />
            )}
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
