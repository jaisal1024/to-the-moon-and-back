import { useLazyQuery } from '@apollo/client'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import CloseIcon from '@mui/icons-material/Close'
import MenuIcon from '@mui/icons-material/Menu'
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
} from '@mui/material'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import { useRef, useState } from 'react'
import { graphql } from 'src/gql/gql'
import { GetNavBarCollectionsQuery } from 'src/gql/graphql'
import { GET_COLLECTIONS_SORT } from 'src/utils/constants'

import Link from './Link'
import LoadingSpinner from './LoadingSpinner'

/*
if the slug and currentSlug are both equal, then its current route and underline it
if isHome is passed and the currentSlug is undefined, then underline home route
*/
function CollectionListItem({
  isHome,
  slug,
  title,
  currentSlug,
}: {
  isHome?: boolean
  slug?: string
  title: string
  currentSlug: string | string[]
}) {
  return (
    <ListItem disablePadding>
      <ListItemButton
        href={isHome ? '/' : `/collections/${slug}`}
        className={clsx(
          (slug === currentSlug || (isHome && !currentSlug)) &&
            'underline underline-offset-8'
        )}
      >
        <Typography variant="body1">{title}</Typography>
      </ListItemButton>
    </ListItem>
  )
}

function CollectionList({
  collectionData,
}: {
  collectionData: GetNavBarCollectionsQuery
}) {
  const {
    query: { id: currentSlug },
  } = useRouter()
  return (
    <List>
      <CollectionListItem title="Home" isHome currentSlug={currentSlug} />
      {collectionData.allCollections.map((collection, i) => (
        <CollectionListItem
          key={collection._id ?? i}
          title={collection.title}
          slug={collection.slug.current}
          currentSlug={currentSlug}
        />
      ))}
    </List>
  )
}

export default function NavBar() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [showCollections, setShowCollections] = useState(false)
  const collectionAnchorRef = useRef()
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
  )
  return (
    <AppBar position="static" color="transparent">
      <Toolbar variant="dense">
        <Link href="/" noLinkStyle className="cursor-pointer">
          <Typography variant="h3" color="inherit">
            Jaisal Friedman
          </Typography>
        </Link>
        <Box sx={{ flexGrow: 1 }} />
        <div
          className="hidden cursor-pointer p-1 underline underline-offset-8 sm:block"
          onClick={() => {
            setShowCollections(true)
            getNavBarCollections()
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
            {fetchError && <Typography>Failed to fetch collections</Typography>}
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
            setMobileDrawerOpen(true)
            getNavBarCollections()
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
            <Typography variant="h4" className="font-bold">
              Collections
            </Typography>
            {loading && <LoadingSpinner />}
            {fetchError && (
              <Typography variant="body2">
                Failed to fetch collections
              </Typography>
            )}
            {collectionData && (
              <CollectionList collectionData={collectionData} />
            )}
          </DialogContent>
        </Dialog>
      </Toolbar>
    </AppBar>
  )
}
