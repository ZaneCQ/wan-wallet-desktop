import React, { Component } from 'react';
import { Menu, Icon } from 'antd';
import { Link } from 'react-router-dom';
import { observer, inject } from 'mobx-react';
import intl from 'react-intl-universal';
import style from './index.less';
import logo from 'static/image/logo.png';
import open from 'static/image/navbar-open.png';
import collapse from 'static/image/navbar-collapse.png';
import { CROSSCHAINTYPE, WALLET_CHAIN } from 'utils/settings';

const { SubMenu, Item } = Menu;

@inject(stores => ({
  chainId: stores.session.chainId,
  settings: stores.session.settings,
  tokensOnSideBar: stores.tokens.tokensOnSideBar,
  sidebarColumns: stores.languageIntl.sidebarColumns,
  crossChainOnSideBar: stores.crossChain.crossChainOnSideBar,
  twoWayBridgeOnSideBar: stores.crossChain.twoWayBridgeOnSideBar,
  dAppsOnSideBar: stores.dapps.dAppsOnSideBar,
}))

@observer
class Sidebar extends Component {
  state = {
    collapsed: false,
  }

  toggleMenu = () => {
    this.setState({
      collapsed: !this.state.collapsed
    });
    this.props.handleNav();
  }

  /* onMouseEnter = (e) => {
    console.log('onMouseEnter:', e);
    let target = e.domEvent.target;
    console.log('target:', target);
    let event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);
    target.dispatchEvent(event);
  } */

  renderMenu = data => {
    return data.map(item => {
      if (item.children) {
        if (item.mode) {
          return (
            <SubMenu key={item.key} mode={item.mode} /* onTitleMouseEnter={this.onMouseEnter} onTitleMouseLeave={this.onMouseEnter} */ title={<span><em className={style['com-circle']}></em><span>{item.title}</span></span>}>
              {this.renderMenu(item.children)}
            </SubMenu>
          );
        } else {
          return (
            <SubMenu key={item.key} title={<span><Icon type={item.icon} /><span>{item.title}</span></span>} className={item.step === '1' ? 'ant-menu-top-item' : ''}>
              {this.renderMenu(item.children)}
            </SubMenu>
          );
        }
      }
      // console.log('key:::::::::::::::', item.key);
      return (
        <Item key={item.key} className={item.step === '1' ? 'ant-menu-top-item' : ''}>
          <Link to={item.key}>
            {item.step === '1' ? <Icon type={item.icon} /> : !item.noCircle && <em className={style['com-circle']}></em>}
            <span>{item.title}</span>
          </Link>
        </Item>
      )
    });
  }

  render() {
    const { sidebarColumns, settings, tokensOnSideBar, crossChainOnSideBar, twoWayBridgeOnSideBar, dAppsOnSideBar } = this.props;
    let stakeIndex = sidebarColumns.findIndex(item => item.key === '/staking');
    let dAppsIndex = sidebarColumns.findIndex(item => item.key === '/thirdPartyDapps');
    let offlineIndex = sidebarColumns.findIndex(item => item.key === '/offline');
    let stakeChildren = sidebarColumns[stakeIndex].children;
    let dAppsChildren = sidebarColumns[dAppsIndex].children;
    let walletIndex = sidebarColumns.findIndex(item => item.key === '/wallet');
    let walletChildren = sidebarColumns[walletIndex].children;
    let crossChainIndex = sidebarColumns.findIndex(item => item.key === '/crossChain');
    let crossChainChildren = sidebarColumns[crossChainIndex].children;
    let crossChainLen = CROSSCHAINTYPE.length;
    let walletChainLen = WALLET_CHAIN.length;
    if (offlineIndex === -1 && settings.offline_wallet) {
      sidebarColumns.push({
        title: intl.get('menuConfig.offline'),
        step: '1',
        key: '/offline',
        icon: 'bank'
      })
    } else if (offlineIndex !== -1 && !settings.offline_wallet) {
      sidebarColumns.splice(offlineIndex, 1);
    }

    let index = stakeChildren.findIndex(item => item.key === '/validator');
    if (index === -1 && settings.staking_advance) {
      stakeChildren.push({
        title: intl.get('menuConfig.validator'),
        key: '/validator',
        icon: 'block'
      })
    } else if (index !== -1 && !settings.staking_advance) {
      stakeChildren.splice(index, 1);
    }

    /* if (tokensOnSideBar.length) {
      walletChildren.splice(
        walletChainLen,
        walletChildren.length - walletChainLen,
        ...tokensOnSideBar.map(item => ({
          title: item.symbol,
          key: `/tokens/${item.chain}/${item.tokenAddr}/${item.symbol}`,
          icon: 'block'
        })),
      );
    } else {
      walletChildren.splice(walletChainLen, walletChildren.length - walletChainLen);
    } */

    /* if (tokensOnSideBar.length) {
      walletChildren.splice(
        walletChainLen,
        walletChildren.length - walletChainLen,
        ...tokensOnSideBar.map(item => ({
          title: item.symbol,
          key: `/tokens/${item.symbol}`,
          icon: 'block',
          mode: 'vertical',
          children: [{
            title: 'ETHEREUM',
            // key: `/${'eth'}Account/${'ETH'}`,
            key: `/tokens/${item.chain}/${item.tokenAddr}/${item.symbol}/eth`,
            noCircle: true,
          }, {
            title: 'WANCHAIN',
            key: `/tokens/${item.chain}/${item.tokenAddr}/${item.symbol}/wan`,
            noCircle: true,
          }]
        })),
      );
    } else {
      walletChildren.splice(walletChainLen, walletChildren.length - walletChainLen);
    } */

    walletChildren.splice(0, walletChildren.length, /* {
      title: 'BTC',
      key: `Account_${'BTC'}`,
      icon: 'block',
      mode: 'vertical',
      children: [{
        title: 'BITCOIN',
        key: `/${'btc'}Account/${'btc'}`,
        noCircle: true,
      }, {
        title: 'WANCHAIN',
        key: `/${'btc'}Account/${'wan'}`,
        noCircle: true,
      }]
    },  */{
        title: 'ETH',
        key: `Account_${'ETH'}`,
        icon: 'block',
        mode: 'vertical',
        children: [{
          title: 'ETHEREUM',
          key: `/${'eth'}Account/${'ETH'}/ETHEREUM`,
          noCircle: true,
        }, {
          title: 'WANCHAIN',
          key: `/${'eth'}Account/${'WAN'}/WANCHAIN`,
          noCircle: true,
        }]
      }, {
        title: 'CVC',
        key: `Account_${'CVC'}`,
        icon: 'block',
        mode: 'vertical',
        children: [{
          title: 'WANCHAIN',
          key: `/${'eth'}Account/${'CVC'}/WANCHAIN`,
          noCircle: true,
        }, {
          title: 'ETHEREUM',
          key: `/${'eth'}Account/${'CVC'}/ETHEREUM`,
          noCircle: true,
        }]
      }, {
        title: 'EURS',
        key: `Account_${'EURS'}`,
        icon: 'block',
        mode: 'vertical',
        children: [{
          title: 'WANCHAIN',
          key: `/${'eth'}Account/${'EURS'}/WANCHAIN`,
          noCircle: true,
        }, {
          title: 'ETHEREUM',
          key: `/${'eth'}Account/${'EURS'}/ETHEREUM`,
          noCircle: true,
        }]
      }, {
        title: 'GUSD',
        key: `Account_${'GUSD'}`,
        icon: 'block',
        mode: 'vertical',
        children: [{
          title: 'WANCHAIN',
          key: `/${'eth'}Account/${'CVC'}/WANCHAIN`,
          noCircle: true,
        }, {
          title: 'ETHEREUM',
          key: `/${'eth'}Account/${'CVC'}/ETHEREUM`,
          noCircle: true,
        }]
      }, {
        title: 'LINK',
        key: `Account_${'LINK'}`,
        icon: 'block',
        mode: 'vertical',
        children: [{
          title: 'WANCHAIN',
          key: `/${'eth'}Account/${'LINK'}/WANCHAIN`,
          noCircle: true,
        }, {
          title: 'ETHEREUM',
          key: `/${'eth'}Account/${'LINK'}/ETHEREUM`,
          noCircle: true,
        }]
      }, {
        title: 'LRC',
        key: `Account_${'LRC'}`,
        icon: 'block',
        mode: 'vertical',
        children: [{
          title: 'WANCHAIN',
          key: `/${'eth'}Account/${'LRC'}/WANCHAIN`,
          noCircle: true,
        }, {
          title: 'ETHEREUM',
          key: `/${'eth'}Account/${'LRC'}/ETHEREUM`,
          noCircle: true,
        }]
      }, {
        title: 'MKR',
        key: `Account_${'MKR'}`,
        icon: 'block',
        mode: 'vertical',
        children: [{
          title: 'WANCHAIN',
          key: `/${'eth'}Account/${'MKR'}/WANCHAIN`,
          noCircle: true,
        }, {
          title: 'ETHEREUM',
          key: `/${'eth'}Account/${'MKR'}/ETHEREUM`,
          noCircle: true,
        }]
      });

    // Add token.
    walletChildren.push({
      title: intl.get('Sidebar.moreTokens'),
      key: `/MoreAccount`,
      icon: 'block'
    });

    /* if (crossChainOnSideBar.length) {
      crossChainChildren.splice(crossChainLen, crossChainChildren.length - crossChainLen, ...crossChainOnSideBar.map(item => {
        return ({
          title: item.symbol,
          key: `/crossChain/${item.chain}/${item.chain !== 'EOS' ? item.tokenAddr : item.tokenOrigAddr}/${item.symbol}`,
          icon: 'block'
        })
      }));
    } else {
      crossChainChildren.splice(crossChainLen, crossChainChildren.length - crossChainLen);
    } */
    /* if (twoWayBridgeOnSideBar.length) {
      crossChainChildren.splice(crossChainChildren.length, 0, ...twoWayBridgeOnSideBar.map(item => ({
        title: item.symbol,
        key: `/crosschain/${item.key}/${item.first_address ? item.first_address : ''}-${item.second_address ? item.second_address : ''}`,
        icon: 'block'
      })));
    } */

    crossChainChildren.splice(0, crossChainChildren.length);
    crossChainChildren.splice(crossChainChildren.length, 0, {
      title: 'BTC',
      key: `${'CrossChain_BTC'}`,
      icon: 'block',
      mode: 'vertical',
      children: [{
        title: 'Bitcoin <-> Wanchain',
        key: `/crosschain/Bitcoin-Wanchain/-0x89a3e1494bc3db81dadc893ded7476d33d47dcbd`,
        noCircle: true,
      }, {
        title: 'Bitcoin <-> Ethereum',
        key: `/crosschain/Wanchain-Ethereum/-0x89a3e1494bc3db81dadc893ded7476d33d47dcbd`,
        noCircle: true,
      }, {
        title: 'Ethereum <-> Wanchain',
        key: `/crosschain/Ethereum-Wanchain/-0x89a3e1494bc3db81dadc893ded7476d33d47dcbd`,
        noCircle: true,
      }]
    });

    // Add cross chain.
    crossChainChildren.push({
      title: intl.get('MoreCrossChain.more'),
      key: `/moreCrossChain`,
      icon: 'block'
    });

    if (dAppsOnSideBar.length) {
      dAppsChildren.splice(0, dAppsChildren.length - 1, ...dAppsOnSideBar.map(item => {
        let trimUrl = item.url.split('://')[1];
        return ({
          title: item.name,
          key: `/dapp/${trimUrl}`,
          icon: item.icon ? item.icon : 'block'
        })
      }));
    } else {
      dAppsChildren.splice(0, dAppsChildren.length - 1);
    }

    return (
      <div>
        <div className={style.sidebar + ' sidebar'}>
          <div className={style.logo}>
            <img className={style.expandedLogo} src={logo} alt={intl.get('Sidebar.wanchain')} />
          </div>
          <Menu theme="dark" mode="inline" defaultSelectedKeys={[this.props.path]} className={style.menuTreeNode}>
            {this.renderMenu(sidebarColumns)}
          </Menu>
        </div>
        <div className={style.collapseItem + ' collapseItem'}>
          <img src={this.state.collapsed ? open : collapse} className={style.collapseButton} onClick={this.toggleMenu} />
        </div>
      </div>
    );
  }
}

export default Sidebar;
