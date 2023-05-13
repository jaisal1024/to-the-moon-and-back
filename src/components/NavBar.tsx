import { useLazyQuery } from '@apollo/client';
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
import clsx from 'clsx';
import { useRouter } from 'next/router';
import { useRef, useState } from 'react';
import { graphql } from 'src/gql/gql';
import { GetNavBarCollectionsQuery } from 'src/gql/graphql';
import useCollectionSlug from 'src/hooks/useCollectionSlug';
import { GET_COLLECTIONS_SORT } from 'src/utils/constants';

import Link from './Link';
import LoadingSpinner from './LoadingSpinner';

/*
if the href is equal to the router pathname then underline the text
*/
function CollectionListItem({ title, href }: { href: string; title: string }) {
  const { asPath } = useRouter();
  return (
    <ListItem disablePadding>
      <ListItemButton
        href={href}
        className={clsx(href === asPath && 'underline underline-offset-8')}
      >
        <Typography variant="body1">{title}</Typography>
      </ListItemButton>
    </ListItem>
  );
}

function CollectionList({
  collectionData,
}: {
  collectionData: GetNavBarCollectionsQuery;
}) {
  return (
    <List>
      <CollectionListItem title="Home" href="/" />
      {collectionData.allCollections.map((collection, i) => (
        <CollectionListItem
          key={collection._id ?? i}
          title={collection.title}
          href={`/collections/${collection.slug.current}`}
        />
      ))}
    </List>
  );
}

export default function NavBar() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const collectionAnchorRef = useRef();
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
        sort: GET_COLLECTIONS_SORT,
      },
    }
  );
  const collectionSlug = useCollectionSlug();
  const { pathname } = useRouter();

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{ paddingY: 1 }}
    >
      <Toolbar variant="dense">
        <Link href="/" noLinkStyle className="cursor-pointer">
          <Typography variant="h2" color="inherit">
            Jaisal Friedman
          </Typography>
        </Link>
        <Box sx={{ flexGrow: 1 }} />
        <div
          className={clsx(
            (collectionSlug || pathname === '/') &&
              'underline underline-offset-8',
            'hidden cursor-pointer p-1 sm:block'
          )}
          onClick={() => {
            setShowCollections(true);
            getNavBarCollections();
          }}
          ref={collectionAnchorRef}
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
            'hidden cursor-pointer p-1 sm:block'
          )}
        >
          <Link href="/about" noLinkStyle>
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
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography variant="h3">Collections</Typography>
            {loading && <LoadingSpinner />}
            {fetchError && (
              <Typography variant="body2" className="py-2 text-dangerRed">
                Failed to fetch collections
              </Typography>
            )}
            {collectionData && (
              <CollectionList collectionData={collectionData} />
            )}
            <Typography variant="h3">About</Typography>
            <CollectionListItem title="Home" href="/about" />
          </DialogContent>
        </Dialog>
      </Toolbar>
    </AppBar>
  );
}
